const crypto = require('crypto');

const attachCurrentUser = (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth?error=Сначала войдите в аккаунт');
  }

  next();
};

const ensureCsrfToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
};

const verifyCsrfToken = (req, res, next) => {
  const token = req.body?.csrf_token;

  if (!token || token !== req.session.csrfToken) {
    return res.status(403).send('CSRF token invalid');
  }

  next();
};

module.exports = {
  attachCurrentUser,
  requireAuth,
  ensureCsrfToken,
  verifyCsrfToken,
};
