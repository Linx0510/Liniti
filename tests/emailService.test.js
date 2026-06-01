const assert = require('node:assert/strict');
const test = require('node:test');

const { _private } = require('../services/emailService');

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

  try {
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test('console delivery is enabled explicitly', () => {
  withEnv({ EMAIL_DELIVERY: 'console', SMTP_HOST: 'smtp.gmail.com', SMTP_CONSOLE_FALLBACK: undefined }, () => {
    assert.equal(_private.isConsoleDeliveryEnabled(), true);
  });
});

test('SMTP delivery remains the default even when SMTP is not configured', () => {
  withEnv({ EMAIL_DELIVERY: undefined, SMTP_HOST: undefined, SMTP_CONSOLE_FALLBACK: undefined }, () => {
    assert.equal(_private.isConsoleDeliveryEnabled(), false);
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
