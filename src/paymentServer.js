const http = require('http');
const { URL } = require('url');

const TEST_LICENSE_KEY = 'CLIPLY-PRO-TEST';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function createProSubscription(licenseKey = TEST_LICENSE_KEY) {
  return {
    plan: 'pro',
    licenseKey,
    activatedAt: new Date().toISOString(),
    expiresAt: ''
  };
}

function createPaymentServer() {
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/') {
      sendHtml(res, `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><title>Cliply 本地授权服务</title></head>
  <body style="font-family: sans-serif; max-width: 720px; margin: 48px auto; line-height: 1.7;">
    <h1>Cliply 本地授权服务已启动</h1>
    <p>这是开发测试用服务，不是真实支付。</p>
    <p>测试 License Key：</p>
    <pre style="padding: 16px; background: #f4f4f4;">${TEST_LICENSE_KEY}</pre>
  </body>
</html>`);
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/checkout') {
      sendHtml(res, `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><title>Cliply 测试支付页</title></head>
  <body style="font-family: sans-serif; max-width: 720px; margin: 48px auto; line-height: 1.7;">
    <h1>Cliply Pro 测试支付页</h1>
    <p>真实支付以后会替换这里。当前用于验证 App 的外部支付页和激活流程。</p>
    <p>复制下面的 License Key 回到 App 激活：</p>
    <pre style="padding: 16px; background: #f4f4f4;">${TEST_LICENSE_KEY}</pre>
  </body>
</html>`);
      return;
    }

    try {
      if (req.method === 'POST' && requestUrl.pathname === '/v1/checkout') {
        await readJson(req);
        sendJson(res, 200, {
          checkoutUrl: 'http://localhost:8787/checkout'
        });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/v1/licenses/activate') {
        const body = await readJson(req);
        const licenseKey = String(body.licenseKey || '').trim();
        if (licenseKey !== TEST_LICENSE_KEY) {
          sendJson(res, 402, { error: 'Invalid test license key' });
          return;
        }
        sendJson(res, 200, { subscription: createProSubscription(licenseKey) });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/v1/licenses/refresh') {
        const body = await readJson(req);
        const licenseKey = String(body.licenseKey || '').trim();
        if (licenseKey !== TEST_LICENSE_KEY) {
          sendJson(res, 402, { error: 'Invalid test license key' });
          return;
        }
        sendJson(res, 200, { subscription: createProSubscription(licenseKey) });
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Bad request' });
    }
  });
}

module.exports = {
  TEST_LICENSE_KEY,
  createPaymentServer
};
