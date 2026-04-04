const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_secret_for_ci';

const { app } = require('../server');

const makeRequest = (server, path, method = 'GET', body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });

test('GET /lenta_new.html redirects guest users to /auth', async () => {
  const server = app.listen(0);

  try {
    const response = await makeRequest(server, '/lenta_new.html');

    assert.equal(response.statusCode, 302);
    assert.match(response.headers.location || '', /^\/auth\?error=/);
  } finally {
    server.close();
  }
});

test('GET /auth returns page with csrf token field', async () => {
  const server = app.listen(0);

  try {
    const response = await makeRequest(server, '/auth');

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /name="csrf_token"/);
  } finally {
    server.close();
  }
});
