const db = require('../config/database');

const ensureOrdersTable = async (queryable) => {
    await queryable.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            executor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price NUMERIC(12, 2) NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            deadline DATE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        )
    `);

    await queryable.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS executor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS deadline DATE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
    `);
};

const ensureServicesTable = async (queryable) => {
    await queryable.query(`
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            provider_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            source_order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            price NUMERIC(12, 2) NOT NULL DEFAULT 0,
            start_date DATE,
            deadline DATE,
            avg_rating NUMERIC(3, 1) NOT NULL DEFAULT 0,
            total_reviews INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await queryable.query(`
        ALTER TABLE services
        ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS source_order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS deadline DATE,
        ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3, 1) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    await queryable.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'services' AND column_name = 'executor_id'
            ) THEN
                UPDATE services
                SET provider_id = COALESCE(provider_id, executor_id)
                WHERE provider_id IS NULL;
            END IF;
        END $$;
    `);

    await queryable.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'services' AND column_name = 'user_id'
            ) THEN
                UPDATE services
                SET provider_id = COALESCE(provider_id, user_id)
                WHERE provider_id IS NULL;
            END IF;
        END $$;
    `);
};

const hasServicesUserIdColumn = async (queryable) => {
    const result = await queryable.query(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'services' AND column_name = 'user_id'
        ) AS exists
    `);

    return result.rows[0].exists;
};

// Создание задачи
const createOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const { title, description, price, executor_id, start_date, deadline } = req.body;

    if (!title || !price) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const parsedExecutorId = executor_id ? Number(executor_id) : null;
    const parsedStartDate = start_date || null;
    const parsedDeadline = deadline || null;

    const categoriesRaw = req.body.categories;
    const categoryIds = Array.isArray(categoriesRaw)
        ? categoriesRaw.map(Number).filter((id) => Number.isInteger(id) && id > 0)
        : (categoriesRaw ? [Number(categoriesRaw)].filter((id) => Number.isInteger(id) && id > 0) : []);

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        await ensureOrdersTable(client);

        await client.query(`
            CREATE TABLE IF NOT EXISTS order_categories (
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                PRIMARY KEY (order_id, category_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS order_files (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                file_url TEXT NOT NULL,
                original_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const result = await client.query(`
            INSERT INTO orders (customer_id, executor_id, title, description, price, status, deadline)
            VALUES ($1, $2, $3, $4, $5, 'active', $6)
            RETURNING *
        `, [req.session.user.id, parsedExecutorId, title, description, price, parsedDeadline]);

        const orderId = result.rows[0].id;

        for (const catId of categoryIds) {
            await client.query(`
                INSERT INTO order_categories (order_id, category_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [orderId, catId]);
        }

        const uploadedFiles = Array.isArray(req.files) ? req.files : [];
        for (const file of uploadedFiles) {
            await client.query(`
                INSERT INTO order_files (order_id, file_url, original_name)
                VALUES ($1, $2, $3)
            `, [orderId, `/uploads/order-files/${file.filename}`, file.originalname]);
        }

        await ensureServicesTable(client);
        const hasLegacyUserId = await hasServicesUserIdColumn(client);

        const serviceProviderId = parsedExecutorId || req.session.user.id;

        const serviceQuery = hasLegacyUserId
            ? `
                INSERT INTO services (user_id, provider_id, source_order_id, title, price, start_date, deadline)
                VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7)
                ON CONFLICT (source_order_id) DO UPDATE
                SET user_id = EXCLUDED.user_id,
                    provider_id = EXCLUDED.provider_id,
                    title = EXCLUDED.title,
                    price = EXCLUDED.price,
                    start_date = EXCLUDED.start_date,
                    deadline = EXCLUDED.deadline,
                    updated_at = CURRENT_TIMESTAMP
            `
            : `
                INSERT INTO services (provider_id, source_order_id, title, price, start_date, deadline)
                VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE))
                ON CONFLICT (source_order_id) DO UPDATE
                SET provider_id = EXCLUDED.provider_id,
                    title = EXCLUDED.title,
                    price = EXCLUDED.price,
                    start_date = EXCLUDED.start_date,
                    deadline = EXCLUDED.deadline,
                    updated_at = CURRENT_TIMESTAMP
            `;

        const serviceParams = hasLegacyUserId
            ? [serviceProviderId, serviceProviderId, orderId, title, price, parsedStartDate, parsedDeadline]
            : [serviceProviderId, orderId, title, price, parsedStartDate, parsedDeadline];

        await client.query(serviceQuery, serviceParams);

        // Создаём уведомление для исполнителя
        if (parsedExecutorId) {
            await client.query(`
                INSERT INTO notifications (user_id, message, link)
                VALUES ($1, $2, $3)
            `, [parsedExecutorId, `Новая задача: ${title}`, '/orders']);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, order: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Ошибка при создании задачи' });
    } finally {
        client.release();
    }
};


// Получение задач из витрины услуг
const getServicesCatalog = async (_req, res) => {
    try {
        await ensureServicesTable(db);

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

// Получение задач пользователя
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
                   e.last_name as executor_last_name,
                   COALESCE((
                       SELECT ARRAY_AGG(category_id ORDER BY category_id)
                       FROM order_categories
                       WHERE order_id = o.id
                   ), ARRAY[]::integer[]) AS category_ids
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
        res.status(500).json({ error: 'Ошибка при загрузке задач' });
    }
};

// Принятие задачи исполнителем
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
            return res.status(404).json({ error: 'Задача не найдена или уже принята' });
        }
        
        // Уведомление заказчику
        await db.query(`
            INSERT INTO notifications (user_id, message, link)
            VALUES ($1, $2, $3)
        `, [order.rows[0].customer_id, `Исполнитель принял вашу задачу "${order.rows[0].title}"`, '/orders']);
        
        res.json({ success: true, order: order.rows[0] });
    } catch (error) {
        console.error('Accept order error:', error);
        res.status(500).json({ error: 'Ошибка при принятии задачи' });
    }
};

// Завершение задачи
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
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        
        // Уведомление исполнителю
        if (order.rows[0].executor_id) {
            await db.query(`
                INSERT INTO notifications (user_id, message, link)
                VALUES ($1, $2, $3)
            `, [order.rows[0].executor_id, `Задача "${order.rows[0].title}" завершена`, '/orders']);
        }
        
        res.json({ success: true, order: order.rows[0] });
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({ error: 'Ошибка при завершении задачи' });
    }
};

// Отмена задачи
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
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        
        // Уведомление другой стороне
        const otherUserId = order.rows[0].customer_id === userId 
            ? order.rows[0].executor_id 
            : order.rows[0].customer_id;
        
        if (otherUserId) {
            await db.query(`
                INSERT INTO notifications (user_id, message, link)
                VALUES ($1, $2, $3)
            `, [otherUserId, `Задача "${order.rows[0].title}" была отменена`, '/orders']);
        }
        
        res.json({ success: true, order: order.rows[0] });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Ошибка при отмене задачи' });
    }
};

// Оставить отзыв на задачу
const reviewOrder = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.session.user.id;
    
    try {
        // Проверяем, что задача завершена и пользователь участвовал в ней
        const order = await db.query(`
            SELECT * FROM orders
            WHERE id = $1 AND status = 'completed'
            AND (customer_id = $2 OR executor_id = $2)
        `, [orderId, userId]);
        
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
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
