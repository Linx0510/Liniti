const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, csrfProtect } = require('../middleware/authMiddleware');

// Подписка/отписка
router.post('/api/subscribe', requireAuth, async (req, res) => {
    const { userId, action } = req.body;
    const currentUserId = req.session.user.id;
    
    if (currentUserId === parseInt(userId)) {
        return res.status(400).json({ error: 'Нельзя подписаться на самого себя' });
    }
    
    try {
        if (action === 'subscribe') {
            await db.query(`
                INSERT INTO subscriptions (follower_id, followed_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [currentUserId, userId]);
        } else {
            await db.query(`
                DELETE FROM subscriptions
                WHERE follower_id = $1 AND followed_id = $2
            `, [currentUserId, userId]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Ошибка при изменении подписки' });
    }
});

// Получение уведомлений
router.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const notifications = await db.query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 20
        `, [req.session.user.id]);
        
        res.json(notifications.rows);
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Ошибка загрузки уведомлений' });
    }
});

// Отметить уведомления как прочитанные
router.post('/api/notifications/read', requireAuth, async (req, res) => {
    try {
        await db.query(`
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1 AND is_read = FALSE
        `, [req.session.user.id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении уведомлений' });
    }
});
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif'];
        cb(null, allowed.includes(file.mimetype));
    }
});

// Обновление профиля
router.post('/api/profile/update', requireAuth, upload.single('avatar'), async (req, res) => {
    const { first_name, last_name, email, bio, current_password, new_password, confirm_password } = req.body;
    const userId = req.session.user.id;
    
    try {
        // Проверяем, не занят ли email другим пользователем
        if (email !== req.session.user.email) {
            const existing = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email уже используется' });
            }
        }
        
        let updateQuery = `
            UPDATE users 
            SET first_name = $1, last_name = $2, email = $3, bio = $4
        `;
        let params = [first_name, last_name, email, bio || null];
        let paramIndex = 5;
        
        // Обновляем аватар если загружен
        if (req.file) {
            const avatarUrl = '/uploads/avatars/' + req.file.filename;
            updateQuery += `, avatar = $${paramIndex}`;
            params.push(avatarUrl);
            paramIndex++;
        }
        
        // Обновляем пароль если указан
        if (new_password) {
            if (new_password !== confirm_password) {
                return res.status(400).json({ error: 'Пароли не совпадают' });
            }
            
            // Проверяем текущий пароль
            const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            const valid = await bcrypt.compare(current_password, user.rows[0].password_hash);
            
            if (!valid) {
                return res.status(400).json({ error: 'Неверный текущий пароль' });
            }
            
            const newHash = await bcrypt.hash(new_password, 10);
            updateQuery += `, password_hash = $${paramIndex}`;
            params.push(newHash);
            paramIndex++;
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(userId);
        
        const result = await db.query(updateQuery, params);
        
        // Обновляем сессию
        req.session.user = {
            id: result.rows[0].id,
            first_name: result.rows[0].first_name,
            last_name: result.rows[0].last_name,
            email: result.rows[0].email,
            avatar: result.rows[0].avatar
        };
        
        res.json({ success: true });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении профиля' });
    }
});
// Импорт новых контроллеров
const orderController = require('../controllers/orderController');
const chatController = require('../controllers/chatController');

// Маршруты для заказов
router.post('/orders/create', requireAuth, csrfProtect, orderController.createOrder);
router.get('/orders', requireAuth, orderController.getUserOrders);
router.post('/orders/:orderId/accept', requireAuth, orderController.acceptOrder);
router.post('/orders/:orderId/complete', requireAuth, orderController.completeOrder);
router.post('/orders/:orderId/cancel', requireAuth, orderController.cancelOrder);
router.post('/orders/:orderId/review', requireAuth, orderController.reviewOrder);

// Маршруты для чата
router.get('/chats', requireAuth, chatController.getUserChats);
router.get('/chats/user/:userId', requireAuth, chatController.getOrCreateChat);
router.get('/chats/:chatId/messages', requireAuth, chatController.getChatMessages);
router.post('/chats/:chatId/messages', requireAuth, chatController.sendMessage);
router.post('/chats/:chatId/draft', requireAuth, chatController.saveDraft);
router.get('/chats/:chatId/draft', requireAuth, chatController.getDraft);

module.exports = router;
