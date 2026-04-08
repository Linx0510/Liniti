const db = require('../config/database');

// Создание заказа
const createOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { title, description, price, executor_id, start_date, deadline, category_id } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const parsedExecutorId = executor_id ? Number(executor_id) : null;
    const parsedCategoryId = category_id ? Number(category_id) : null;
    const parsedStartDate = start_date || null;
    const parsedDeadline = deadline || null;

    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');

        const result = await client.query(`
            INSERT INTO orders (customer_id, executor_id, title, description, price, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING *
        `, [req.session.user.id, parsedExecutorId, title, description, price]);

        await client.query(`
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                source_order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                start_date DATE,
                deadline DATE,
                avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
                total_reviews INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            INSERT INTO services (provider_id, category_id, source_order_id, title, price, start_date, deadline)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (source_order_id) DO UPDATE
            SET provider_id = EXCLUDED.provider_id,
                category_id = EXCLUDED.category_id,
                title = EXCLUDED.title,
                price = EXCLUDED.price,
                start_date = EXCLUDED.start_date,
                deadline = EXCLUDED.deadline,
                updated_at = CURRENT_TIMESTAMP
        `, [parsedExecutorId || req.session.user.id, parsedCategoryId, result.rows[0].id, title, price, parsedStartDate, parsedDeadline]);
        
        // Создаём уведомление для исполнителя
        if (parsedExecutorId) {
            await client.query(`
                INSERT INTO notifications (user_id, message)
                VALUES ($1, $2)
            `, [parsedExecutorId, `Новый заказ: ${title}`]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, order: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Ошибка при создании заказа' });
    } finally {
        client.release();
    }
};


// Получение заказов из витрины услуг
const getServicesCatalog = async (_req, res) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                source_order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                start_date DATE,
                deadline DATE,
                avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
                total_reviews INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const result = await db.query(`
            SELECT
                s.id AS service_id,
                s.title AS service_title,
                s.price,
                s.start_date,
                s.deadline,
                s.avg_rating,
                s.total_reviews,
                COALESCE(u.first_name || ' ' || u.last_name, 'Не назначен') AS provider_name,
                c.name AS category_name
            FROM services s
            LEFT JOIN users u ON s.provider_id = u.id
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY s.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get services catalog error:', error);
        res.status(500).json({ error: 'Ошибка при загрузке каталога услуг' });
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
    getServicesCatalog,
    getUserOrders,
    acceptOrder,
    completeOrder,
    cancelOrder,
    reviewOrder
};