const crypto = require('crypto');

// Middleware для прикрепления текущего пользователя к res.locals
const attachCurrentUser = (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
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
