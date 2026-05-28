const https = require('https');

const SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const IS_TEST = process.env.YOOKASSA_TEST === 'true' || SECRET_KEY.startsWith('test_');

const authHeader = 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

function yookassaRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.yookassa.ru',
      port: 443,
      path: `/v3${path}`,
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Idempotence-Key': `${Date.now()}-${Math.random()}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, body: parsed });
          }
        } catch (e) {
          reject({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = {
  createPayment: (payload) => yookassaRequest('/payments', 'POST', payload),
  capturePayment: (paymentId, payload) => yookassaRequest(`/payments/${paymentId}/capture`, 'POST', payload),
  cancelPayment: (paymentId) => yookassaRequest(`/payments/${paymentId}/cancel`, 'POST', {}),
  getPayment: (paymentId) => yookassaRequest(`/payments/${paymentId}`, 'GET'),
  createPayout: (payload) => yookassaRequest('/payouts', 'POST', payload),
  getPayout: (payoutId) => yookassaRequest(`/payouts/${payoutId}`, 'GET'),
  IS_TEST,
};
