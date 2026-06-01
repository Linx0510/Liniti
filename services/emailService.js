const net = require('net');
const tls = require('tls');
const os = require('os');

const SMTP_TIMEOUT_MS = Number.parseInt(process.env.SMTP_TIMEOUT_MS || '10000', 10);

const escapeHeader = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();

const encodeSubject = (subject) => {
  const safeSubject = escapeHeader(subject);
  return /^[\x00-\x7F]*$/.test(safeSubject)
    ? safeSubject
    : `=?UTF-8?B?${Buffer.from(safeSubject, 'utf8').toString('base64')}?=`;
};

const normalizeAddress = (address) => {
  const safeAddress = escapeHeader(address);
  const match = safeAddress.match(/<([^>]+)>/);
  return match ? match[1] : safeAddress;
};

const dotStuff = (content) => content.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');

class SmtpClient {
  constructor({ host, port, secure }) {
    this.host = host;
    this.port = port;
    this.secure = secure;
    this.socket = null;
    this.buffer = '';
    this.pending = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const onError = (error) => {
        this.cleanup();
        reject(error);
      };

      const socketFactory = this.secure ? tls.connect : net.connect;
      this.socket = socketFactory({ host: this.host, port: this.port, servername: this.host }, async () => {
        try {
          await this.readResponse([220]);
          resolve();
        } catch (error) {
          onError(error);
        }
      });

      this.socket.setTimeout(SMTP_TIMEOUT_MS, () => {
        this.socket.destroy(new Error('SMTP connection timeout'));
      });
      this.socket.on('data', (chunk) => this.handleData(chunk));
      this.socket.on('error', onError);
    });
  }

  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.pending.splice(0).forEach(({ reject }) => reject(new Error('SMTP connection closed')));
  }

  handleData(chunk) {
    this.buffer += chunk.toString('utf8');
    let index;
    while ((index = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, index + 1).replace(/\r?\n$/, '');
      this.buffer = this.buffer.slice(index + 1);
      const current = this.pending[0];
      if (!current) continue;
      current.lines.push(line);

      if (/^\d{3} /.test(line)) {
        this.pending.shift();
        const code = Number.parseInt(line.slice(0, 3), 10);
        if (current.expectedCodes.includes(code)) {
          current.resolve({ code, lines: current.lines });
        } else {
          current.reject(new Error(`SMTP command failed: ${current.lines.join(' | ')}`));
        }
      }
    }
  }

  readResponse(expectedCodes) {
    return new Promise((resolve, reject) => {
      this.pending.push({ expectedCodes, resolve, reject, lines: [] });
    });
  }

  async command(command, expectedCodes = [250]) {
    this.socket.write(`${command}\r\n`);
    return this.readResponse(expectedCodes);
  }

  async upgradeToTls() {
    await this.command('STARTTLS', [220]);
    this.socket.removeAllListeners('data');
    this.socket = tls.connect({ socket: this.socket, servername: this.host });
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('error', (error) => this.cleanup(error));
  }
}

const sendViaSmtp = async ({ to, subject, text, html }) => {
  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const useStartTls = process.env.SMTP_STARTTLS !== 'false' && !secure;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (!host || !from) {
    throw new Error('SMTP_HOST and SMTP_FROM (or SMTP_USER) are required to send email');
  }

  const client = new SmtpClient({ host, port, secure });
  await client.connect();

  try {
    const ehloHost = os.hostname() || 'localhost';
    await client.command(`EHLO ${ehloHost}`, [250]);

    if (useStartTls) {
      await client.upgradeToTls();
      await client.command(`EHLO ${ehloHost}`, [250]);
    }

    if (user && pass) {
      await client.command('AUTH LOGIN', [334]);
      await client.command(Buffer.from(user).toString('base64'), [334]);
      await client.command(Buffer.from(pass).toString('base64'), [235]);
    }

    const boundary = `liniti-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const message = [
      `From: ${escapeHeader(from)}`,
      `To: ${escapeHeader(to)}`,
      `Subject: ${encodeSubject(subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      text,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html || text.replace(/\n/g, '<br>'),
      '',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    await client.command(`MAIL FROM:<${normalizeAddress(from)}>`, [250]);
    await client.command(`RCPT TO:<${normalizeAddress(to)}>`, [250, 251]);
    await client.command('DATA', [354]);
    client.socket.write(`${dotStuff(message)}\r\n.\r\n`);
    await client.readResponse([250]);
    await client.command('QUIT', [221]);
  } finally {
    client.cleanup();
  }
};

const isConsoleDeliveryEnabled = () => process.env.EMAIL_DELIVERY === 'console';

const isConsoleFallbackEnabled = () => process.env.SMTP_CONSOLE_FALLBACK === 'true';

const isGmailBadCredentialsError = (error) => (
  /smtp\.gmail\.com/i.test(process.env.SMTP_HOST || '')
  && /535[-\s]5\.7\.8|BadCredentials|Username and Password not accepted/i.test(error?.message || '')
);

const logVerificationCode = (to, code) => {
  console.warn(`SMTP email delivery is disabled. Verification code for ${to}: ${code}`);
};

const buildGmailCredentialsError = (error) => {
  const message = [
    'Gmail rejected SMTP credentials. Create a Google App Password and put it in SMTP_PASS/SMTP_PASSWORD; regular Gmail passwords are not accepted for SMTP.',
    `Original error: ${error.message}`,
  ].join(' ');
  return new Error(message);
};

const sendVerificationCode = async ({ to, code }) => {
  const subject = 'Код подтверждения LineStok';
  const text = [
    `Ваш код подтверждения LineStok: ${code}`,
    '',
    'Введите этот 4-значный код на странице авторизации.',
    'Код действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте письмо.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5">
      <h2 style="margin:0 0 16px">Код подтверждения LineStok</h2>
      <p>Введите этот 4-значный код на странице авторизации:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0">${code}</div>
      <p>Код действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте письмо.</p>
    </div>
  `;

  if (isConsoleDeliveryEnabled()) {
    logVerificationCode(to, code);
    return;
  }

  try {
    await sendViaSmtp({ to, subject, text, html });
  } catch (error) {
    if (isConsoleFallbackEnabled()) {
      console.warn(`SMTP email delivery failed; falling back to console delivery. Original error: ${error.message}`);
      logVerificationCode(to, code);
      return;
    }

    if (isGmailBadCredentialsError(error)) {
      throw buildGmailCredentialsError(error);
    }

    throw error;
  }
};

module.exports = {
  sendVerificationCode,
  _private: {
    buildGmailCredentialsError,
    isConsoleDeliveryEnabled,
    isConsoleFallbackEnabled,
    isGmailBadCredentialsError,
  },
};
