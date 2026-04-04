const db = require('../config/database');

// Создание заказа
const createOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { title, description, price, executor_id } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
    }
    
    try {
        const result = await db.query(`
            INSERT INTO orders (customer_id, executor_id, title, description, price, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING *
        `, [req.session.user.id, executor_id || null, title, description, price]);
        
        // Создаём уведомление для исполнителя
        if (executor_id) {
            await db.query(`
                INSERT INTO notifications (user_id, message)
                VALUES ($1, $2)
            `, [executor_id, `Новый заказ: ${title}`]);
        }
        
        res.status(201).json({ success: true, order: result.rows[0] });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Ошибка при создании заказа' });
    }
};

// Получение заказов пользователя
const getUserOrders = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { status } = req.query;
    const userId = req.session.user.id;
    
    try {
        let query = `
            SELECT o.*, 
                   c.first_name as customer_first_name, 
                   c.last_name as customer_last_name,
                   e.first_name as executor_first_name,
                   e.last_name as executor_last_name
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users e ON o.executor_id = e.id
            WHERE o.customer_id = $1 OR o.executor_id = $1
        `;
        let params = [userId];
        
        if (status && status !== 'all') {
            query += ` AND o.status = $2`;
            params.push(status);
        }
        
        query += ` ORDER BY o.created_at DESC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Ошибка при загрузке заказов' });
    }
};

// Принятие заказа исполнителем
const acceptOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { orderId } = req.params;
    const userId = req.session.user.id;
    
    try {
        const order = await db.query(`
            UPDATE orders
            SET executor_id = $1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'active'
            RETURNING *
        `, [userId, orderId]);
        
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден или уже принят' });
        }
        
        // Уведомление заказчику
        await db.query(`
            INSERT INTO notifications (user_id, message)
            VALUES ($1, $2)
        `, [order.rows[0].customer_id, `Исполнитель принял ваш заказ "${order.rows[0].title}"`]);
        
        res.json({ success: true, order: order.rows[0] });
    } catch (error) {
        console.error('Accept order error:', error);
        res.status(500).json({ error: 'Ошибка при принятии заказа' });
    }
};

// Завершение заказа
const completeOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { orderId } = req.params;
    const userId = req.session.user.id;
    
    try {
        // Проверяем, что пользователь - заказчик
        const order = await db.query(`
            UPDATE orders
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND customer_id = $2 AND status = 'in_progress'
            RETURNING *
        `, [orderId, userId]);
        
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        // Уведомление исполнителю
        if (order.rows[0].executor_id) {
            await db.query(`
                INSERT INTO notifications (user_id, message)
                VALUES ($1, $2)
            `, [order.rows[0].executor_id, `Заказ "${order.rows[0].title}" завершён`]);
        }
        
        res.json({ success: true, order: order.rows[0] });
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({ error: 'Ошибка при завершении заказа' });
    }
};

// Отмена заказа
const cancelOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { orderId } = req.params;
    const userId = req.session.user.id;
    
    try {
        const order = await db.query(`
            UPDATE orders
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND (customer_id = $2 OR executor_id = $2)
            AND status IN ('active', 'in_progress')
            RETURNING *
        `, [orderId, userId]);
        
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        // Уведомление другой стороне
        const otherUserId = order.rows[0].customer_id === userId 
            ? order.rows[0].executor_id 
            : order.rows[0].customer_id;
        
        if (otherUserId) {
            await db.query(`
                INSERT INTO notifications (user_id, message)
                VALUES ($1, $2)
            `, [otherUserId, `Заказ "${order.rows[0].title}" был отменён`]);
        }
        
        res.json({ success: true, order: order.rows[0] });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Ошибка при отмене заказа' });
    }
};

// Оставить отзыв на заказ
const reviewOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.session.user.id;
    
    try {
        // Проверяем, что заказ завершён и пользователь участвовал в нём
        const order = await db.query(`
            SELECT * FROM orders
            WHERE id = $1 AND status = 'completed'
            AND (customer_id = $2 OR executor_id = $2)
        `, [orderId, userId]);
        
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        await db.query(`
            INSERT INTO order_reviews (order_id, reviewer_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (order_id, reviewer_id) DO UPDATE
            SET rating = $3, comment = $4
        `, [orderId, userId, rating, comment]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Review order error:', error);
        res.status(500).json({ error: 'Ошибка при сохранении отзыва' });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    acceptOrder,
    completeOrder,
    cancelOrder,
    reviewOrder
};