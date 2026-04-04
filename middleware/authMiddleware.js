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

module.exports = {
  attachCurrentUser,
  requireAuth,
};
