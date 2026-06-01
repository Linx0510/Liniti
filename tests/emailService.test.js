const assert = require('node:assert/strict');
const test = require('node:test');

const { sendVerificationCode, _private } = require('../services/emailService');

const withEnv = (env, callback) => {
  const previous = {};
  for (const key of Object.keys(env)) {
    previous[key] = process.env[key];
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  const restoreEnv = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = callback();
    if (result && typeof result.then === 'function') {
      return result.finally(restoreEnv);
    }
    restoreEnv();
    return result;
  } catch (error) {
    restoreEnv();
    throw error;
  }
};

test('console delivery is enabled explicitly', () => {
  withEnv({ EMAIL_DELIVERY: 'console', SMTP_HOST: 'smtp.gmail.com', SMTP_CONSOLE_FALLBACK: undefined }, () => {
    assert.equal(_private.isConsoleDeliveryEnabled(), true);
    assert.equal(_private.getVerificationDeliveryName(), 'консоль сервера');
    assert.equal(_private.isConsoleFallbackEnabled(), false);
  });
});

test('SMTP delivery remains the default even when SMTP is not configured', () => {
  withEnv({ EMAIL_DELIVERY: undefined, SMTP_HOST: undefined, SMTP_CONSOLE_FALLBACK: undefined }, () => {
    assert.equal(_private.isConsoleDeliveryEnabled(), false);
    assert.equal(_private.getVerificationDeliveryName(), 'почту');
    assert.equal(_private.isConsoleFallbackEnabled(), false);
  });
});


test('console delivery logs the verification code without SMTP', async () => {
  await withEnv({ EMAIL_DELIVERY: 'console', SMTP_HOST: undefined, SMTP_FROM: undefined, SMTP_USER: undefined }, async () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);

    try {
      await sendVerificationCode({ to: 'user@example.com', code: '5678' });
    } finally {
      console.warn = originalWarn;
    }

    assert.deepEqual(warnings, ['SMTP email delivery is disabled. Verification code for user@example.com: 5678']);
  });
});

test('SMTP console fallback is separate from console-only delivery', () => {
  withEnv({ EMAIL_DELIVERY: undefined, SMTP_CONSOLE_FALLBACK: 'true' }, () => {
    assert.equal(_private.isConsoleDeliveryEnabled(), false);
    assert.equal(_private.isConsoleFallbackEnabled(), true);
  });
});

test('SMTP console fallback logs the verification code after SMTP failure', async () => {
  await withEnv({
    EMAIL_DELIVERY: undefined,
    SMTP_CONSOLE_FALLBACK: 'true',
    SMTP_HOST: undefined,
    SMTP_FROM: undefined,
    SMTP_USER: undefined,
  }, async () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);

    try {
      await sendVerificationCode({ to: 'user@example.com', code: '1234' });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /falling back to console delivery/);
    assert.match(warnings[1], /Verification code for user@example\.com: 1234/);
  });
});

test('SMTP delivery is used when requested and configured', () => {
  withEnv({ EMAIL_DELIVERY: 'smtp', SMTP_HOST: 'smtp.gmail.com', SMTP_CONSOLE_FALLBACK: undefined }, () => {
    assert.equal(_private.isConsoleDeliveryEnabled(), false);
  });
});

test('Gmail bad credentials are detected and explained', () => {
  withEnv({ SMTP_HOST: 'smtp.gmail.com' }, () => {
    const smtpError = new Error('SMTP command failed: 535-5.7.8 Username and Password not accepted');
    assert.equal(_private.isGmailBadCredentialsError(smtpError), true);

    const friendlyError = _private.buildGmailCredentialsError(smtpError);
    assert.match(friendlyError.message, /Google App Password/);
    assert.doesNotMatch(friendlyError.message, /EMAIL_DELIVERY=console/);
  });
});
