const db = require('../config/database');
const fs = require('fs');
const path = require('path');


const getTableColumns = async (tableName) => {
    const result = await db.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    );

    return new Set(result.rows.map((row) => row.column_name));
};

const getStatusConstraintValues = async (tableName) => {
    const result = await db.query(
        `SELECT pg_get_constraintdef(c.oid) AS def
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = 'public'
           AND t.relname = $1
           AND c.contype = 'c'
           AND c.conname ILIKE '%status%check%'`,
        [tableName]
    );

    const values = new Set();

    for (const row of result.rows) {
        const definition = row.def || '';
        const matches = definition.match(/'([^']+)'/g) || [];
        for (const match of matches) {
            values.add(match.slice(1, -1));
        }
    }

    return values;
};

const pickAllowedStatus = (inputStatus, allowedStatuses, aliases = {}) => {
    if (!inputStatus || typeof inputStatus !== 'string') return null;

    const normalized = inputStatus.trim();
    const aliasTarget = aliases[normalized] || normalized;

    if (!allowedStatuses || allowedStatuses.size === 0) {
        return aliasTarget;
    }

    if (allowedStatuses.has(aliasTarget)) {
        return aliasTarget;
    }

    const lowerMap = new Map(Array.from(allowedStatuses).map((value) => [value.toLowerCase(), value]));

    if (lowerMap.has(aliasTarget.toLowerCase())) {
        return lowerMap.get(aliasTarget.toLowerCase());
    }

    return null;
};

const toCsv = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        return '';
    }

    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const escapeValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (/[,"\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    };

    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(headers.map((header) => escapeValue(row[header])).join(','));
    }

    return lines.join('\n');
};

// Дашборд - главная страница админки
const getDashboard = async (req, res) => {
    try {
        // Получаем статистику за сегодня
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
                (SELECT COUNT(*) FROM works) as total_works,
                (SELECT COUNT(*) FROM works WHERE created_at >= CURRENT_DATE) as new_works_today,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE status = 'active') as active_orders,
                (SELECT COUNT(*) FROM complaints WHERE status = 'pending') as pending_complaints,
                (SELECT COALESCE(SUM(price), 0) FROM orders WHERE status = 'completed') as total_revenue
            FROM users LIMIT 1
        `);
        
        // Получаем последние действия пользователей
        const recentActivities = await db.query(`
            SELECT 
                al.*,
                u.first_name,
                u.last_name,
                u.email
            FROM user_activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 50
        `);
        
        // Получаем статистику по дням за последние 30 дней
        const dailyStats = await db.query(`
            SELECT 
                date,
                total_users,
                new_users_today as new_users,
                total_works,
                total_orders
            FROM platform_stats
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY date DESC
        `);
        
        // Получаем системные настройки
        const settings = await db.query('SELECT * FROM system_settings');
        const settingsMap = {};
        settings.rows.forEach(s => { settingsMap[s.key] = s.value; });
        
        res.render('admin/dashboard', {
            stats: stats.rows[0],
            recentActivities: recentActivities.rows,
            dailyStats: dailyStats.rows,
            settings: settingsMap
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).send('Ошибка загрузки админ-панели');
    }
};
// Управление пользователями
const getUsers = async (req, res) => {
    const { search, role, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    try {
        let query = `
            SELECT u.*, r.name as role_name,
                   (SELECT COUNT(*) FROM works WHERE user_id = u.id) as works_count,
                   (SELECT COUNT(*) FROM subscriptions WHERE followed_id = u.id) as followers_count
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (role && role !== 'all') {
            query += ` AND r.name = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }
        
        // Получаем общее количество для пагинации
        const countQuery = query.replace(
            /SELECT.*FROM/,
            'SELECT COUNT(*) as total FROM'
        ).replace(/ORDER BY.*$/, '');
        
        const totalResult = await db.query(countQuery, params);
        const total = parseInt(totalResult.rows[0].total);
        
        query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const users = await db.query(query, params);
        
        res.render('admin/users', {
            users: users.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            search,
            role
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send('Ошибка загрузки пользователей');
    }
};
// Редактирование пользователя
const editUser = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, role_id, status, balance } = req.body;
    
    try {
        await db.query(`
            UPDATE users 
            SET first_name = $1, last_name = $2, email = $3, role_id = $4, status = $5
            WHERE id = $6
        `, [first_name, last_name, email, role_id, status, id]);
        
        if (balance !== undefined) {
            await db.query(`
                UPDATE accounts SET total_balance = $1 WHERE user_id = $2
            `, [balance, id]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Edit user error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
    }
};
// Блокировка пользователя
const blockUser = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        const userColumns = await getTableColumns('users');
        const setFragments = [];
        const values = [];

        if (userColumns.has('status')) {
            setFragments.push(`status = $${values.length + 1}`);
            values.push('blocked');
        }
        if (userColumns.has('blocked_reason')) {
            setFragments.push(`blocked_reason = $${values.length + 1}`);
            values.push(reason || null);
        }
        if (userColumns.has('is_blocked')) {
            setFragments.push(`is_blocked = $${values.length + 1}`);
            values.push(true);
        }

        if (setFragments.length) {
            values.push(id);
            await db.query(`
                UPDATE users SET ${setFragments.join(', ')} WHERE id = $${values.length}
            `, values);
        }
        
        // Блокируем все работы пользователя
        const workStatuses = await getStatusConstraintValues('works');
        const blockedStatus = pickAllowedStatus('blocked', workStatuses, { blocked: 'blocked' });
        if (blockedStatus) {
            await db.query(`
                UPDATE works SET status = $1 WHERE user_id = $2 AND status != $1
            `, [blockedStatus, id]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Ошибка при блокировке пользователя' });
    }
};
// Разблокировка пользователя
const unblockUser = async (req, res) => {
    const { id } = req.params;
    
    try {
        const userColumns = await getTableColumns('users');
        const setFragments = [];
        const values = [];

        if (userColumns.has('status')) {
            setFragments.push(`status = $${values.length + 1}`);
            values.push('active');
        }
        if (userColumns.has('blocked_reason')) {
            setFragments.push(`blocked_reason = NULL`);
        }
        if (userColumns.has('is_blocked')) {
            setFragments.push(`is_blocked = $${values.length + 1}`);
            values.push(false);
        }

        if (setFragments.length) {
            values.push(id);
            await db.query(`
                UPDATE users SET ${setFragments.join(', ')} WHERE id = $${values.length}
            `, values);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ error: 'Ошибка при разблокировке пользователя' });
    }
};
// Управление работами
const getWorks = async (req, res) => {
    const { search, status, page = 1 } = req.query;
    const selectedStatus = status || 'pending';
    const limit = 20;
    const offset = (page - 1) * limit;
    
    try {
        let query = `
            SELECT w.*, u.first_name, u.last_name, u.email,
                   (SELECT COUNT(*) FROM complaints WHERE work_id = w.id) as complaints_count
            FROM works w
            JOIN users u ON w.user_id = u.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (w.title ILIKE $${paramIndex} OR w.description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (selectedStatus !== 'all') {
            query += ` AND w.status = $${paramIndex}`;
            params.push(selectedStatus);
            paramIndex++;
        }
        
        const countResult = await db.query(`
            SELECT COUNT(*)::int as total
            FROM works w
            JOIN users u ON w.user_id = u.id
            WHERE 1=1
              AND ($1::text IS NULL OR (w.title ILIKE $1 OR w.description ILIKE $1))
              AND ($2::text IS NULL OR w.status = $2)
        `, [search ? `%${search}%` : null, selectedStatus !== 'all' ? selectedStatus : null]);
        const total = countResult.rows[0]?.total || 0;

        query += ` ORDER BY w.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const works = await db.query(query, params);
        
        res.render('admin/works', {
            works: works.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            search,
            status: selectedStatus
        });
    } catch (error) {
        console.error('Get works error:', error);
        res.status(500).send('Ошибка загрузки работ');
    }
};
// Модерация работы
const moderateWork = async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    try {
        const columns = await getTableColumns('works');
        const allowedStatuses = await getStatusConstraintValues('works');
        const nextStatus = pickAllowedStatus(status, allowedStatuses, {
            approved: 'active',
            cancelled: 'cancelled',
            rejected: 'cancelled',
        });

        if (!nextStatus) {
            return res.status(400).json({ error: 'Некорректный статус модерации' });
        }

        const setFragments = ['status = $1'];
        const values = [nextStatus];

        if (columns.has('moderation_comment')) {
            setFragments.push(`moderation_comment = $${values.length + 1}`);
            values.push(reason || null);
        }

        values.push(id);

        await db.query(`
            UPDATE works SET ${setFragments.join(', ')} WHERE id = $${values.length}
        `, values);
        
        // Уведомляем автора
        const work = await db.query(`
            SELECT w.user_id, w.title FROM works w WHERE w.id = $1
        `, [id]);

        if (!work.rows.length) {
            return res.status(404).json({ error: 'Работа не найдена' });
        }
        
        const message = nextStatus === 'blocked'
            ? `Ваша работа "${work.rows[0].title}" была заблокирована. Причина: ${reason}`
            : nextStatus === 'cancelled'
                ? `Ваша работа "${work.rows[0].title}" не прошла модерацию и была отменена${reason ? `. Причина: ${reason}` : ''}`
                : `Ваша работа "${work.rows[0].title}" была одобрена и опубликована`;
        
        await db.query(`
            INSERT INTO notifications (user_id, message)
            VALUES ($1, $2)
        `, [work.rows[0].user_id, message]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Moderate work error:', error);
        res.status(500).json({ error: 'Ошибка при модерации работы' });
    }
};
// Жалобы
const getComplaints = async (req, res) => {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    try {
        let query = `
            SELECT c.*, 
                   u.first_name as sender_first_name, u.last_name as sender_last_name, u.email as sender_email,
                   w.title as work_title, w.user_id as author_id,
                   a.first_name as author_first_name, a.last_name as author_last_name,
                   cr.name as reason_name
            FROM complaints c
            JOIN users u ON c.sender_id = u.id
            JOIN works w ON c.work_id = w.id
            JOIN users a ON w.user_id = a.id
            JOIN complaint_reasons cr ON c.reason_id = cr.id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (status && status !== 'all') {
            query += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        const countQuery = query.replace(
            /SELECT.*FROM/,
            'SELECT COUNT(*) as total FROM'
        ).replace(/ORDER BY.*$/, '');
        
        const totalResult = await db.query(countQuery, params);
        const total = parseInt(totalResult.rows[0].total);
        
        query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const complaints = await db.query(query, params);
        
        res.render('admin/complaints', {
            complaints: complaints.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            status
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).send('Ошибка загрузки жалоб');
    }
};
// Решение по жалобе
const resolveComplaint = async (req, res) => {
    const { id } = req.params;
    const { status, action } = req.body;
    
    try {
        const allowedStatuses = await getStatusConstraintValues('complaints');
        const nextStatus = pickAllowedStatus(status, allowedStatuses, {
            resolved: 'resolved',
            approved: 'approved',
            rejected: 'rejected',
            pending: 'pending',
        });

        if (!nextStatus) {
            return res.status(400).json({ error: 'Некорректный статус жалобы' });
        }

        await db.query(`
            UPDATE complaints SET status = $1 WHERE id = $2
        `, [nextStatus, id]);
        
        // Если жалоба одобрена, блокируем работу
        if (action === 'block_work') {
            const complaint = await db.query(`
                SELECT work_id FROM complaints WHERE id = $1
            `, [id]);
            
            const workStatuses = await getStatusConstraintValues('works');
            const blockedStatus = pickAllowedStatus('blocked', workStatuses, { blocked: 'blocked' });

            if (blockedStatus) {
                await db.query(`
                    UPDATE works SET status = $1 WHERE id = $2
                `, [blockedStatus, complaint.rows[0].work_id]);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Resolve complaint error:', error);
        res.status(500).json({ error: 'Ошибка при обработке жалобы' });
    }
};
// Экспорт данных
const exportData = async (req, res) => {
    const { type, format, date_from, date_to } = req.query;
    
    try {
        let data = [];
        let filename = '';
        
        switch (type) {
            case 'users':
                data = await exportUsers(date_from, date_to);
                filename = `users_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'works':
                data = await exportWorks(date_from, date_to);
                filename = `works_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'orders':
                data = await exportOrders(date_from, date_to);
                filename = `orders_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'complaints':
                data = await exportComplaints(date_from, date_to);
                filename = `complaints_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'transactions':
                data = await exportTransactions(date_from, date_to);
                filename = `transactions_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'full_backup':
                data = await exportFullBackup();
                filename = `full_backup_${new Date().toISOString().split('T')[0]}`;
                break;
        }
        
        if (format === 'csv') {
            const csv = toCsv(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
            res.send(csv);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
            res.json(data);
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Ошибка при экспорте данных' });
    }
};
// Функции экспорта
async function exportUsers(date_from, date_to) {
    let query = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.created_at,
               r.name as role, u.status,
               (SELECT COUNT(*) FROM works WHERE user_id = u.id) as works_count,
               (SELECT COUNT(*) FROM orders WHERE customer_id = u.id) as orders_as_customer,
               (SELECT COUNT(*) FROM orders WHERE executor_id = u.id) as orders_as_executor
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date_from) {
        query += ` AND u.created_at >= $${params.length + 1}`;
        params.push(date_from);
    }
    if (date_to) {
        query += ` AND u.created_at <= $${params.length + 1}`;
        params.push(date_to);
    }
    
    const result = await db.query(query, params);
    return result.rows;
}
async function exportWorks(date_from, date_to) {
    let query = `
        SELECT w.id, w.title, w.description, w.status, w.likes, w.created_at,
               u.first_name, u.last_name, u.email,
               (SELECT COUNT(*) FROM complaints WHERE work_id = w.id) as complaints_count
        FROM works w
        JOIN users u ON w.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date_from) {
        query += ` AND w.created_at >= $${params.length + 1}`;
        params.push(date_from);
    }
    if (date_to) {
        query += ` AND w.created_at <= $${params.length + 1}`;
        params.push(date_to);
    }
    
    const result = await db.query(query, params);
    return result.rows;
}
async function exportOrders(date_from, date_to) {
    let query = `
        SELECT o.id, o.title, o.description, o.price, o.status, o.created_at, o.completed_at,
               c.first_name as customer_first_name, c.last_name as customer_last_name,
               e.first_name as executor_first_name, e.last_name as executor_last_name
        FROM orders o
        JOIN users c ON o.customer_id = c.id
        LEFT JOIN users e ON o.executor_id = e.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date_from) {
        query += ` AND o.created_at >= $${params.length + 1}`;
        params.push(date_from);
    }
    if (date_to) {
        query += ` AND o.created_at <= $${params.length + 1}`;
        params.push(date_to);
    }
    
    const result = await db.query(query, params);
    return result.rows;
}
async function exportComplaints(date_from, date_to) {
    let query = `
        SELECT c.id, c.status, c.created_at,
               s.first_name as sender_first_name, s.last_name as sender_last_name,
               w.title as work_title,
               cr.name as reason_name
        FROM complaints c
        JOIN users s ON c.sender_id = s.id
        JOIN works w ON c.work_id = w.id
        JOIN complaint_reasons cr ON c.reason_id = cr.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date_from) {
        query += ` AND c.created_at >= $${params.length + 1}`;
        params.push(date_from);
    }
    if (date_to) {
        query += ` AND c.created_at <= $${params.length + 1}`;
        params.push(date_to);
    }
    
    const result = await db.query(query, params);
    return result.rows;
}
async function exportTransactions(date_from, date_to) {
    let query = `
        SELECT t.id, t.amount, t.type, t.description, t.created_at,
               u.first_name, u.last_name, u.email
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date_from) {
        query += ` AND t.created_at >= $${params.length + 1}`;
        params.push(date_from);
    }
    if (date_to) {
        query += ` AND t.created_at <= $${params.length + 1}`;
        params.push(date_to);
    }
    
    const result = await db.query(query, params);
    return result.rows;
}
async function exportFullBackup() {
    const backup = {
        exported_at: new Date().toISOString(),
        users: await exportUsers(),
        works: await exportWorks(),
        orders: await exportOrders(),
        complaints: await exportComplaints(),
        transactions: await exportTransactions(),
        categories: (await db.query('SELECT * FROM categories')).rows,
        system_settings: (await db.query('SELECT * FROM system_settings')).rows
    };
    return backup;
}
// Обновление системных настроек
const updateSettings = async (req, res) => {
    const settings = req.body;
    
    try {
        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE
                SET value = $2, updated_at = CURRENT_TIMESTAMP
            `, [key, value]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении настроек' });
    }
};
// Обновление статистики платформы (запускается по расписанию)
const updatePlatformStats = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        await db.query(`
            INSERT INTO platform_stats (date, total_users, total_works, total_orders, total_revenue, active_users_today, new_users_today)
            SELECT 
                CURRENT_DATE,
                (SELECT COUNT(*) FROM users),
                (SELECT COUNT(*) FROM works),
                (SELECT COUNT(*) FROM orders),
                (SELECT COALESCE(SUM(price), 0) FROM orders WHERE status = 'completed'),
                (SELECT COUNT(DISTINCT user_id) FROM user_activity_logs WHERE created_at >= CURRENT_DATE),
                (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE)
            ON CONFLICT (date) DO UPDATE SET
                total_users = EXCLUDED.total_users,
                total_works = EXCLUDED.total_works,
                total_orders = EXCLUDED.total_orders,
                total_revenue = EXCLUDED.total_revenue,
                active_users_today = EXCLUDED.active_users_today,
                new_users_today = EXCLUDED.new_users_today
        `);
    } catch (error) {
        console.error('Update stats error:', error);
    }
};
module.exports = {
    getDashboard,
    getUsers,
    editUser,
    blockUser,
    unblockUser,
    getWorks,
    moderateWork,
    getComplaints,
    resolveComplaint,
    exportData,
    updateSettings,
    updatePlatformStats
};
