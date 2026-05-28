const db = require('../config/database');
const yookassa = require('../config/yookassa');
const { getOrCreateBalance, ensureBalanceTables } = require('./paymentController');

const ensureWithdrawalTables = async (queryable) => {
  await ensureBalanceTables(queryable);
  await queryable.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      payment_method VARCHAR(20) NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card', 'sbp', 'yoomoney')),
      details TEXT NOT NULL DEFAULT '',
      bank_id VARCHAR(50),
      rejection_reason TEXT,
      payout_error TEXT,
      payment_method_id VARCHAR(100),
      yookassa_payout_id VARCHAR(100),
      processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP
    )
  `);
};

const createWithdrawal = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const userId = req.session.user.id;
  const amount = parseFloat(req.body.amount);
  const paymentMethod = req.body.paymentMethod || 'card';
  const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
  const bankId = typeof req.body.bankId === 'string' ? req.body.bankId.trim() : '';
  const paymentMethodId = typeof req.body.paymentMethodId === 'string' ? req.body.paymentMethodId.trim() : '';

  if (!amount || amount < 1000) {
    return res.status(400).json({ error: 'Минимальная сумма вывода — 1 000 ₽' });
  }
  if (amount > 500000) {
    return res.status(400).json({ error: 'Максимальная сумма вывода — 500 000 ₽' });
  }
  if (!details || details.length < 5) {
    return res.status(400).json({ error: 'Укажите реквизиты для вывода' });
  }
  if (!['card', 'sbp', 'yoomoney'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Неверный способ вывода' });
  }
  if (paymentMethod === 'sbp' && !bankId) {
    return res.status(400).json({ error: 'Выберите банк для СБП' });
  }
  if (paymentMethod === 'card' && !paymentMethodId) {
    return res.status(400).json({ error: 'Выберите сохранённую карту для выплаты' });
  }

  try {
    await db.query('BEGIN');
    await ensureWithdrawalTables(db);

    const balance = await getOrCreateBalance(userId, db);
    if (Number(balance.balance) < amount) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно средств на балансе' });
    }

    await db.query(
      `UPDATE user_balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [amount, userId]
    );

    await db.query(
      `INSERT INTO payments (user_id, type, amount, status, description)
       VALUES ($1, 'withdraw', $2, 'pending', $3)`,
      [userId, amount, `Заявка на вывод ${amount} ₽`]
    );

    const result = await db.query(
      `INSERT INTO withdrawal_requests (user_id, amount, status, payment_method, details, bank_id, payment_method_id)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6)
       RETURNING *`,
      [userId, amount, paymentMethod, details, bankId || null, paymentMethodId || null]
    );

    await db.query('COMMIT');
    return res.json({ success: true, request: result.rows[0] });
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Create withdrawal error:', error);
    return res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
};

const getMyWithdrawals = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const result = await db.query(
      `SELECT id, amount, status, payment_method, details, bank_id, rejection_reason, payout_error, created_at, processed_at
       FROM withdrawal_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.session.user.id]
    );
    return res.json({ withdrawals: result.rows });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return res.status(500).json({ error: 'Ошибка при загрузке заявок' });
  }
};

const getAllWithdrawals = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const user = await db.query(`SELECT role_id FROM users WHERE id = $1`, [req.session.user.id]);
  const isAdmin = user.rows[0]?.role_id === 1;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  try {
    const result = await db.query(
      `SELECT w.*, u.first_name, u.last_name, u.email
       FROM withdrawal_requests w
       JOIN users u ON w.user_id = u.id
       ORDER BY w.created_at DESC
       LIMIT 200`
    );
    return res.json({ withdrawals: result.rows });
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    return res.status(500).json({ error: 'Ошибка при загрузке заявок' });
  }
};

const buildPayoutDestination = (withdrawal) => {
  const method = withdrawal.payment_method;
  const details = withdrawal.details;
  if (method === 'yoomoney') {
    return { type: 'yoo_money', account_number: details };
  }
  if (method === 'sbp') {
    return {
      type: 'sbp',
      phone: details,
      bank_id: withdrawal.bank_id,
    };
  }
  if (method === 'card') {
    return {
      type: 'bank_card',
      payout_token: withdrawal.payment_method_id,
    };
  }
  return null;
};

const approveWithdrawal = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const adminId = req.session.user.id;
  const user = await db.query(`SELECT role_id FROM users WHERE id = $1`, [adminId]);
  const isAdmin = user.rows[0]?.role_id === 1;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { id } = req.params;
  try {
    await db.query('BEGIN');

    const request = await db.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (request.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Заявка не найдена или уже обработана' });
    }

    const reqData = request.rows[0];
    const payoutDestination = buildPayoutDestination(reqData);

    // Если есть возможность автовыплаты — пробуем
    let payoutId = null;
    if (payoutDestination) {
      try {
        const payoutPayload = {
          amount: {
            value: Number(reqData.amount).toFixed(2),
            currency: 'RUB',
          },
          payout_destination_data: payoutDestination,
          description: `Выплата по заявке #${id}`,
          metadata: {
            withdrawal_id: String(id),
            user_id: String(reqData.user_id),
          },
        };
        if (yookassa.IS_TEST) {
          payoutPayload.test = true;
        }
        const payout = await yookassa.createPayout(payoutPayload);
        payoutId = payout.id;
      } catch (payoutError) {
        console.error('Yookassa payout error:', payoutError);
        const errorBody = payoutError.body || payoutError;
        await db.query(
          `UPDATE withdrawal_requests SET payout_error = $1 WHERE id = $2`,
          [JSON.stringify(errorBody), id]
        );
        await db.query('COMMIT');
        return res.status(400).json({
          error: 'Ошибка при создании выплаты через ЮKassa',
          details: errorBody,
        });
      }
    }

    await db.query(
      `UPDATE withdrawal_requests
       SET status = 'approved', processed_by = $1, processed_at = CURRENT_TIMESTAMP, yookassa_payout_id = $2
       WHERE id = $3`,
      [adminId, payoutId, id]
    );

    await db.query(
      `UPDATE payments SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND type = 'withdraw' AND status = 'pending'
       AND amount = $2 AND created_at >= (SELECT created_at FROM withdrawal_requests WHERE id = $3)
       LIMIT 1`,
      [reqData.user_id, reqData.amount, id]
    );

    await db.query('COMMIT');
    return res.json({ success: true, payoutId });
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Approve withdrawal error:', error);
    return res.status(500).json({ error: 'Ошибка при подтверждении' });
  }
};

const rejectWithdrawal = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const adminId = req.session.user.id;
  const user = await db.query(`SELECT role_id FROM users WHERE id = $1`, [adminId]);
  const isAdmin = user.rows[0]?.role_id === 1;
  if (!isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { id } = req.params;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

  try {
    const request = await db.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена или уже обработана' });
    }

    const reqData = request.rows[0];

    await db.query('BEGIN');

    await db.query(
      `UPDATE user_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [reqData.amount, reqData.user_id]
    );

    await db.query(
      `UPDATE withdrawal_requests
       SET status = 'rejected', processed_by = $1, processed_at = CURRENT_TIMESTAMP, rejection_reason = $2
       WHERE id = $3`,
      [adminId, reason || null, id]
    );

    await db.query(
      `UPDATE payments SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND type = 'withdraw' AND status = 'pending'
       AND amount = $2 AND created_at >= $3
       LIMIT 1`,
      [reqData.user_id, reqData.amount, reqData.created_at]
    );

    await db.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Reject withdrawal error:', error);
    return res.status(500).json({ error: 'Ошибка при отклонении' });
  }
};

module.exports = {
  ensureWithdrawalTables,
  createWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
};
