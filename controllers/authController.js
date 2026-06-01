const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { createPendingVerification, verifyPendingCode } = require('../services/twoFactorService');
const { getVerificationDeliveryName } = require('../services/emailService');

const getPendingEmail = (req) => req.session.pendingTwoFactor?.email || '';

const getAuthPage = (req, res) => {
  const requestedMode = req.query.mode || 'login';
  const mode = requestedMode === 'verify' && !req.session.pendingTwoFactor ? 'login' : requestedMode;

  return res.render('auth', {
    error: req.query.error || '',
    success: req.query.success || '',
    mode,
    pendingEmail: mode === 'verify' ? getPendingEmail(req) : '',
    verificationDeliveryName: getVerificationDeliveryName(),
  });
};

const buildSessionUser = (user) => ({
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
});

const buildVerificationSuccessMessage = () => `Мы отправили 4-значный код в ${getVerificationDeliveryName()}`;

const redirectToVerification = (res, success = buildVerificationSuccessMessage()) => (
  res.redirect(`/auth?mode=verify&success=${encodeURIComponent(success)}`)
);

const register = async (req, res) => {
  const { first_name, last_name, name, email, password, confirm_password } = req.body;

  const fullName = (name || '').trim();
  const [parsedFirstName, ...parsedLastName] = fullName.split(/\s+/).filter(Boolean);

  const normalizedFirstName = (first_name || parsedFirstName || '').trim();
  const normalizedLastName = (last_name || parsedLastName.join(' ') || '-').trim();
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !confirm_password) {
    return res.redirect('/auth?mode=register&error=Заполните все поля');
  }

  if (password !== confirm_password) {
    return res.redirect('/auth?mode=register&error=Пароли не совпадают');
  }

  try {
    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.redirect('/auth?mode=register&error=Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await createPendingVerification(req, {
      type: 'register',
      email: normalizedEmail,
      registrationData: {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        passwordHash,
      },
    });

    return redirectToVerification(res, `Мы отправили 4-значный код для завершения регистрации в ${getVerificationDeliveryName()}`);
  } catch (error) {
    console.error('Register error:', error);
    return res.redirect('/auth?mode=register&error=Не удалось отправить код подтверждения');
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.redirect('/auth?error=Введите email и пароль');
  }

  try {
    const user = await userModel.findByEmail(normalizedEmail);

    if (!user) {
      return res.redirect('/auth?error=Неверный email или пароль');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.redirect('/auth?error=Неверный email или пароль');
    }

    await createPendingVerification(req, {
      type: 'login',
      email: user.email,
      user: buildSessionUser(user),
    });

    return redirectToVerification(res);
  } catch (error) {
    console.error('Login error:', error);
    return res.redirect('/auth?error=Не удалось отправить код подтверждения');
  }
};

const verifyTwoFactor = async (req, res) => {
  const code = (req.body.code || '').trim();
  const verification = verifyPendingCode(req, code);

  if (!verification.ok) {
    const messages = {
      not_found: 'Сессия подтверждения не найдена. Войдите или зарегистрируйтесь заново',
      expired: 'Код истёк. Войдите или зарегистрируйтесь заново',
      invalid_format: 'Введите 4 цифры из письма',
      too_many_attempts: 'Слишком много неверных попыток. Запросите новый код',
      wrong_code: 'Неверный код подтверждения',
    };
    const mode = ['not_found', 'expired', 'too_many_attempts'].includes(verification.reason) ? 'login' : 'verify';
    return res.redirect(`/auth?mode=${mode}&error=${encodeURIComponent(messages[verification.reason] || 'Ошибка подтверждения')}`);
  }

  try {
    if (verification.pending.type === 'register') {
      const existingUser = await userModel.findByEmail(verification.pending.registrationData.email);
      if (existingUser) {
        return res.redirect('/auth?mode=register&error=Пользователь с таким email уже существует');
      }

      const user = await userModel.createUser(verification.pending.registrationData);
      req.session.user = buildSessionUser(user);
      return res.redirect('/lenta');
    }

    req.session.user = verification.pending.user;
    return res.redirect('/lenta');
  } catch (error) {
    console.error('Two-factor verification error:', error);
    return res.redirect('/auth?error=Ошибка при подтверждении кода');
  }
};

const cancelTwoFactor = (req, res) => {
  delete req.session.pendingTwoFactor;
  return res.redirect('/auth');
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth?success=Вы вышли из аккаунта');
  });
};

module.exports = {
  getAuthPage,
  register,
  login,
  verifyTwoFactor,
  cancelTwoFactor,
  logout,
};
