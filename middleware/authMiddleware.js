const crypto = require('crypto');
const db = require('../config/database');

// Middleware для прикрепления текущего пользователя к res.locals
const attachCurrentUser = async (req, res, next) => {
  const sessionUser = req.session.user || null;
  res.locals.currentPath = req.path;

  if (!sessionUser) {
    res.locals.currentUser = null;
    return next();
  }

  try {
    const [accountResult, unreadNotificationsResult] = await Promise.all([
      db.query(
        `SELECT COALESCE(total_balance, 0) AS total_balance
         FROM accounts
         WHERE user_id = $1`,
        [sessionUser.id]
      ),
      db.query(
        `SELECT COUNT(*)::int AS unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [sessionUser.id]
      ),
    ]);

    const totalBalance = accountResult.rows[0]?.total_balance ?? 0;
    const unreadNotificationsCount = unreadNotificationsResult.rows[0]?.unread_count ?? 0;

    res.locals.currentUser = {
      ...sessionUser,
      total_balance: totalBalance,
      unread_notifications_count: unreadNotificationsCount,
    };
  } catch (error) {
    console.error('Error attaching current user meta:', error);
    res.locals.currentUser = {
      ...sessionUser,
      total_balance: 0,
      unread_notifications_count: 0,
    };
  }

  next();
};

// Middleware для обеспечения CSRF токена
const ensureCsrfToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

// Middleware для защиты маршрутов (требует авторизации)
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth?error=Требуется авторизация');
  }
  next();
};

// Middleware для защиты от CSRF (для POST запросов)
const csrfProtect = (req, res, next) => {
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (protectedMethods.includes(req.method)) {
    const bodyToken = req.body && typeof req.body === 'object' ? req.body.csrf_token : null;
    const headerToken = req.headers ? req.headers['x-csrf-token'] : null;
    const token = bodyToken || headerToken;
    const sessionToken = req.session ? req.session.csrfToken : null;

    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).send('CSRF token validation failed');
    }
  }
  next();
};

module.exports = {
  attachCurrentUser,
  ensureCsrfToken,
  requireAuth,
  csrfProtect,
};
