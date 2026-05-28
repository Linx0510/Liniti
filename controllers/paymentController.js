const db = require('../config/database');
const yookassa = require('../config/yookassa');

const ensureBalanceTables = async (queryable) => {
  await queryable.query(`
    CREATE TABLE IF NOT EXISTS user_balances (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
      held_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await queryable.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('topup', 'hold', 'release', 'withdraw', 'fee')),
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'canceled')),
      yookassa_payment_id VARCHAR(100),
      metadata JSONB,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await queryable.query(`
    CREATE TABLE IF NOT EXISTS user_payment_methods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_method_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'bank_card',
      last4 VARCHAR(4),
      expiry_month VARCHAR(2),
      expiry_year VARCHAR(4),
      title VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, payment_method_id)
    )
  `);

  // Добавляем колонки в orders для двустороннего подтверждения и платежа
  await queryable.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`);
  await queryable.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN DEFAULT FALSE`);
  await queryable.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS executor_confirmed BOOLEAN DEFAULT FALSE`);
  await queryable.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0`);

  // Инициализируем баланс для существующих пользователей
  await queryable.query(`
    INSERT INTO user_balances (user_id, balance, held_balance)
    SELECT id, 0, 0 FROM users
    ON CONFLICT (user_id) DO NOTHING
  `);
};

const getOrCreateBalance = async (userId, client = db) => {
  await ensureBalanceTables(client);
  const result = await client.query(
    `SELECT * FROM user_balances WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) {
    const insert = await client.query(
      `INSERT INTO user_balances (user_id, balance, held_balance) VALUES ($1, 0, 0) RETURNING *`,
      [userId]
    );
    return insert.rows[0];
  }
  return result.rows[0];
};

const createTopUp = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const userId = req.session.user.id;
  const amount = parseFloat(req.body.amount);

  if (!amount || amount <= 0 || amount > 500000) {
    return res.status(400).json({ error: 'Укажите сумму от 1 до 500 000 ₽' });
  }

  try {
    await ensureBalanceTables(db);

    const returnUrl = `${req.protocol}://${req.get('host')}/balance?status=success`;

    const payment = await yookassa.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description: `Пополнение баланса #${userId}`,
      metadata: {
        user_id: String(userId),
        type: 'topup',
      },
      ...(yookassa.IS_TEST ? { test: true } : {}),
    });

    await db.query(
      `INSERT INTO payments (user_id, type, amount, status, yookassa_payment_id, metadata, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'topup', amount, payment.status === 'succeeded' ? 'succeeded' : 'pending', payment.id, JSON.stringify(payment), payment.description]
    );

    // Если платеж уже succeeded (редко, но возможно)
    if (payment.status === 'succeeded') {
      await db.query(
        `UPDATE user_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [amount, userId]
      );
      await db.query(
        `UPDATE payments SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP WHERE yookassa_payment_id = $1`,
        [payment.id]
      );
    }

    const confirmationUrl = payment.confirmation?.confirmation_url;
    return res.json({ success: true, paymentId: payment.id, confirmationUrl });
  } catch (error) {
    console.error('Create topup error:', error);
    return res.status(500).json({ error: 'Ошибка при создании платежа' });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const event = req.body;
    if (!event || !event.object) {
      return res.status(400).json({ error: 'Invalid event' });
    }

    const objectType = event.object.type;

    // Обработка платежей (пополнение)
    if (objectType === 'payment') {
      const payment = event.object;
      const metadata = payment.metadata || {};
      const userId = parseInt(metadata.user_id, 10);
      const type = metadata.type;

      if (!userId || type !== 'topup') {
        return res.status(400).json({ error: 'Invalid metadata' });
      }

      const dbPayment = await db.query(
        `SELECT * FROM payments WHERE yookassa_payment_id = $1`,
        [payment.id]
      );

      if (dbPayment.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const existing = dbPayment.rows[0];
      if (existing.status === 'succeeded') {
        return res.status(200).json({ success: true });
      }

      if (payment.status === 'succeeded') {
        await db.query('BEGIN');
        await db.query(
          `UPDATE user_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
          [existing.amount, userId]
        );
        await db.query(
          `UPDATE payments SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP, metadata = $1 WHERE yookassa_payment_id = $2`,
          [JSON.stringify(payment), payment.id]
        );

        // Сохраняем payment_method для будущих выплат
        const pm = payment.payment_method;
        if (pm && pm.id) {
          const card = pm.card || {};
          await db.query(
            `INSERT INTO user_payment_methods (user_id, payment_method_id, type, last4, expiry_month, expiry_year, title)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, payment_method_id) DO UPDATE SET
               type = EXCLUDED.type,
               last4 = EXCLUDED.last4,
               expiry_month = EXCLUDED.expiry_month,
               expiry_year = EXCLUDED.expiry_year,
               title = EXCLUDED.title`,
            [
              userId,
              pm.id,
              pm.type || 'bank_card',
              card.last4 || null,
              card.expiry_month || null,
              card.expiry_year || null,
              card.last4 ? `Карта •••• ${card.last4}` : (pm.title || 'Сохранённый способ'),
            ]
          );
        }

        await db.query('COMMIT');
      } else if (payment.status === 'canceled') {
        await db.query(
          `UPDATE payments SET status = 'canceled', updated_at = CURRENT_TIMESTAMP, metadata = $1 WHERE yookassa_payment_id = $2`,
          [JSON.stringify(payment), payment.id]
        );
      }

      return res.status(200).json({ success: true });
    }

    // Обработка выплат (payouts)
    if (objectType === 'payout') {
      const payout = event.object;
      const metadata = payout.metadata || {};
      const withdrawalId = parseInt(metadata.withdrawal_id, 10);

      if (!withdrawalId) {
        return res.status(400).json({ error: 'Invalid payout metadata' });
      }

      if (payout.status === 'succeeded') {
        await db.query(
          `UPDATE withdrawal_requests SET status = 'approved', yookassa_payout_id = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [payout.id, withdrawalId]
        );
      } else if (payout.status === 'canceled') {
        // Возвращаем деньги пользователю
        const wr = await db.query(`SELECT * FROM withdrawal_requests WHERE id = $1`, [withdrawalId]);
        if (wr.rows.length > 0) {
          const w = wr.rows[0];
          await db.query('BEGIN');
          await db.query(
            `UPDATE user_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
            [w.amount, w.user_id]
          );
          await db.query(
            `UPDATE withdrawal_requests SET status = 'rejected', payout_error = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(payout), withdrawalId]
          );
          await db.query('COMMIT');
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown object type' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
};

const getBalance = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const balance = await getOrCreateBalance(req.session.user.id);
    return res.json({
      balance: Number(balance.balance || 0),
      heldBalance: Number(balance.held_balance || 0),
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({ error: 'Ошибка при загрузке баланса' });
  }
};

const getTransactions = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const result = await db.query(
      `SELECT id, type, amount, status, description, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.session.user.id]
    );
    return res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: 'Ошибка при загрузке истории' });
  }
};

const getPaymentMethods = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    await ensureBalanceTables(db);
    const result = await db.query(
      `SELECT id, payment_method_id, type, last4, expiry_month, expiry_year, title, created_at
       FROM user_payment_methods
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    return res.json({ methods: result.rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({ error: 'Ошибка при загрузке способов оплаты' });
  }
};

const deletePaymentMethod = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const userId = req.session.user.id;
  const methodId = parseInt(req.params.id, 10);
  if (!Number.isInteger(methodId) || methodId <= 0) {
    return res.status(400).json({ error: 'Неверный ID' });
  }
  try {
    await ensureBalanceTables(db);
    const result = await db.query(
      `DELETE FROM user_payment_methods WHERE id = $1 AND user_id = $2 RETURNING id`,
      [methodId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Карта не найдена' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return res.status(500).json({ error: 'Ошибка при удалении карты' });
  }
};

module.exports = {
  ensureBalanceTables,
  getOrCreateBalance,
  createTopUp,
  handleWebhook,
  getBalance,
  getTransactions,
  getPaymentMethods,
  deletePaymentMethod,
};
