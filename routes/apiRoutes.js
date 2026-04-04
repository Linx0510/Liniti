const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const db = require('../config/database');
const { requireAuth, csrfProtect } = require('../middleware/authMiddleware');
const orderController = require('../controllers/orderController');
const chatController = require('../controllers/chatController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/api/subscribe', requireAuth, async (req, res) => {
  const { userId, action } = req.body;
  const currentUserId = req.session.user.id;

  if (currentUserId === parseInt(userId, 10)) {
    return res.status(400).json({ error: 'Нельзя подписаться на самого себя' });
  }

  try {
    if (action === 'subscribe') {
      await db.query(
        `
        INSERT INTO subscriptions (follower_id, followed_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
        [currentUserId, userId]
      );
    } else {
      await db.query(
        `
        DELETE FROM subscriptions
        WHERE follower_id = $1 AND followed_id = $2
      `,
        [currentUserId, userId]
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Ошибка при изменении подписки' });
  }
});

router.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await db.query(
      `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
      [req.session.user.id]
    );

    return res.json(notifications.rows);
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ error: 'Ошибка загрузки уведомлений' });
  }
});

router.post('/api/notifications/read', requireAuth, async (req, res) => {
  try {
    await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
    `,
      [req.session.user.id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении уведомлений' });
  }
});

router.post('/api/profile/update', requireAuth, csrfProtect, upload.single('avatar'), async (req, res) => {
  const { first_name, last_name, email, bio, current_password, new_password, confirm_password } = req.body;
  const userId = req.session.user.id;

  try {
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

    const params = [first_name, last_name, email, bio || null];
    let paramIndex = 5;

    if (req.file) {
      updateQuery += `, avatar = $${paramIndex}`;
      params.push(`/uploads/avatars/${req.file.filename}`);
      paramIndex += 1;
    }

    if (new_password) {
      if (new_password !== confirm_password) {
        return res.status(400).json({ error: 'Пароли не совпадают' });
      }

      const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const valid = await bcrypt.compare(current_password, user.rows[0].password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Неверный текущий пароль' });
      }

      const newHash = await bcrypt.hash(new_password, 10);
      updateQuery += `, password_hash = $${paramIndex}`;
      params.push(newHash);
      paramIndex += 1;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(userId);

    const result = await db.query(updateQuery, params);
    const updated = result.rows[0];

    req.session.user = {
      id: updated.id,
      first_name: updated.first_name,
      last_name: updated.last_name,
      email: updated.email,
      avatar: updated.avatar,
    };

    return res.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
});

router.post('/api/orders/create', requireAuth, csrfProtect, orderController.createOrder);
router.get('/api/orders', requireAuth, orderController.getUserOrders);
router.post('/api/orders/:orderId/accept', requireAuth, csrfProtect, orderController.acceptOrder);
router.post('/api/orders/:orderId/complete', requireAuth, csrfProtect, orderController.completeOrder);
router.post('/api/orders/:orderId/cancel', requireAuth, csrfProtect, orderController.cancelOrder);
router.post('/api/orders/:orderId/review', requireAuth, csrfProtect, orderController.reviewOrder);

router.get('/api/chats', requireAuth, chatController.getUserChats);
router.get('/api/chats/user/:userId', requireAuth, chatController.getOrCreateChat);
router.get('/api/chats/:chatId/messages', requireAuth, chatController.getChatMessages);
router.post('/api/chats/:chatId/messages', requireAuth, csrfProtect, chatController.sendMessage);
router.post('/api/chats/:chatId/draft', requireAuth, csrfProtect, chatController.saveDraft);
router.get('/api/chats/:chatId/draft', requireAuth, chatController.getDraft);

module.exports = router;
