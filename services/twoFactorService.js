const crypto = require('crypto');
const { sendVerificationCode } = require('./emailService');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const generateCode = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

const hashCode = (code) => crypto
  .createHmac('sha256', process.env.SESSION_SECRET || 'liniti')
  .update(String(code))
  .digest('hex');

const safeEqual = (value, expected) => {
  const valueBuffer = Buffer.from(String(value));
  const expectedBuffer = Buffer.from(String(expected));
  return valueBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(valueBuffer, expectedBuffer);
};

const createPendingVerification = async (req, { type, email, user, registrationData }) => {
  const code = generateCode();
  req.session.pendingTwoFactor = {
    type,
    email,
    user: user || null,
    registrationData: registrationData || null,
    codeHash: hashCode(code),
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  };

  try {
    await sendVerificationCode({ to: email, code });
  } catch (error) {
    delete req.session.pendingTwoFactor;
    throw error;
  }
};

const verifyPendingCode = (req, code) => {
  const pending = req.session.pendingTwoFactor;

  if (!pending) {
    return { ok: false, reason: 'not_found' };
  }

  if (Date.now() > pending.expiresAt) {
    delete req.session.pendingTwoFactor;
    return { ok: false, reason: 'expired' };
  }

  if (!/^\d{4}$/.test(code || '')) {
    return { ok: false, reason: 'invalid_format' };
  }

  pending.attempts = (pending.attempts || 0) + 1;

  if (!safeEqual(hashCode(code), pending.codeHash)) {
    if (pending.attempts >= MAX_ATTEMPTS) {
      delete req.session.pendingTwoFactor;
      return { ok: false, reason: 'too_many_attempts' };
    }

    return { ok: false, reason: 'wrong_code' };
  }

  delete req.session.pendingTwoFactor;
  return { ok: true, pending };
};

module.exports = {
  createPendingVerification,
  verifyPendingCode,
};
