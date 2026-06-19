const assert = require('assert');
const fs = require('fs');
const { parseTable, tableToTsv } = require('./src/tableParser');
const { transformText } = require('./src/textTransforms');
const { DEFAULT_LOCAL_PAYMENT_API_URL, createPaymentClient } = require('./src/paymentClient');
const { TEST_LICENSE_KEY, createPaymentServer } = require('./src/paymentServer');
const {
  PLAN_FREE,
  PLAN_PRO,
  FREE_HISTORY_LIMIT,
  PRO_HISTORY_LIMIT,
  isProPlan,
  canUseFeature,
  getPlanComparison
} = require('./src/entitlements');

const markdown = `
Here is the table:

| Name | Role | Score |
| --- | --- | --- |
| Alice | PM | 90 |
| Bob | Designer | 88 |

Done.
`;
const markdownTable = parseTable(markdown);
assert(markdownTable);
assert.deepStrictEqual(markdownTable.rows, [
  ['Name', 'Role', 'Score'],
  ['Alice', 'PM', '90'],
  ['Bob', 'Designer', '88']
]);

const csvTable = parseTable('Name,Role\n"Alice, A.",PM\nBob,Dev');
assert(csvTable);
assert.deepStrictEqual(csvTable.rows, [
  ['Name', 'Role'],
  ['Alice, A.', 'PM'],
  ['Bob', 'Dev']
]);

const tsvTable = parseTable('Name\tRole\nAlice\tPM\nBob\tDev');
assert(tsvTable);
assert.strictEqual(tableToTsv(tsvTable.rows), 'Name\tRole\nAlice\tPM\nBob\tDev');

const alignedTable = parseTable('Name    Role    Score\nAlice   PM      90\nBob     Dev     88');
assert(alignedTable);
assert.strictEqual(alignedTable.rowCount, 3);
assert.strictEqual(alignedTable.columnCount, 3);

assert.strictEqual(parseTable('This is just a normal sentence.'), null);

assert.strictEqual(transformText('  a  \n b \n\n c  ', 'single-line'), 'a b c');
assert.strictEqual(transformText(' a    b \n c\t\t d ', 'clean-spaces'), 'a b\nc d');
assert.strictEqual(transformText('b\na\nb\nc', 'dedupe-lines'), 'b\na\nc');
assert.strictEqual(transformText('b\na\nc', 'sort-lines'), 'a\nb\nc');

assert.strictEqual(isProPlan({ plan: PLAN_FREE }), false);
assert.strictEqual(isProPlan({ plan: PLAN_PRO }), true);
assert.strictEqual(canUseFeature({ plan: PLAN_FREE }, 'favorites'), true);
assert.strictEqual(canUseFeature({ plan: PLAN_FREE }, 'globalShortcut'), true);
assert.strictEqual(canUseFeature({ plan: PLAN_FREE }, 'tableTools'), false);
assert.strictEqual(canUseFeature({ plan: PLAN_FREE }, 'textTransforms'), false);
assert.strictEqual(canUseFeature({ plan: PLAN_FREE }, 'imageHistory'), false);
assert.strictEqual(canUseFeature({ plan: PLAN_FREE }, 'fileHistory'), false);
assert.strictEqual(canUseFeature({ plan: PLAN_PRO }, 'tableTools'), true);
assert.strictEqual(FREE_HISTORY_LIMIT, 100);
assert.strictEqual(PRO_HISTORY_LIMIT, 2000);
assert.ok(getPlanComparison().some(row => row.feature === '收藏 / 置顶' && row.free === '支持'));
assert.ok(getPlanComparison().some(row => row.feature === '表格识别与粘贴' && row.free === '不支持' && row.pro === '支持'));

async function testPaymentClient() {
  const localDefaultPayments = createPaymentClient({ env: {} });
  assert.strictEqual(localDefaultPayments.isConfigured(), true);

  const unconfiguredPayments = createPaymentClient({ env: { NODE_ENV: 'production' } });
  assert.strictEqual(unconfiguredPayments.isConfigured(), false);
  await assert.rejects(
    () => unconfiguredPayments.createCheckout({ email: 'user@example.com' }),
    /Payment service is not configured/
  );

  const requests = [];
  const configuredPayments = createPaymentClient({
    env: {
      CLIPLY_PAYMENT_API_URL: 'https://pay.example.test',
      CLIPLY_DEVICE_ID: 'device-123'
    },
    fetchImpl: async (url, options) => {
      requests.push({
        url,
        method: options.method,
        body: JSON.parse(options.body)
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ checkoutUrl: 'https://pay.example.test/checkout/session-1' })
      };
    }
  });
  assert.strictEqual(configuredPayments.isConfigured(), true);
  assert.strictEqual(configuredPayments.getDeviceId(), 'device-123');
  const checkout = await configuredPayments.createCheckout({ email: 'user@example.com' });
  assert.strictEqual(checkout.checkoutUrl, 'https://pay.example.test/checkout/session-1');
  assert.deepStrictEqual(requests[0], {
    url: 'https://pay.example.test/v1/checkout',
    method: 'POST',
    body: {
      product: 'cliply-pro',
      email: 'user@example.com',
      deviceId: 'device-123'
    }
  });

  const activationPayments = createPaymentClient({
    env: {
      CLIPLY_PAYMENT_API_URL: 'https://pay.example.test',
      CLIPLY_DEVICE_ID: 'device-456'
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        subscription: {
          plan: PLAN_PRO,
          licenseKey: 'LIC-123',
          activatedAt: '2026-06-19T00:00:00.000Z'
        }
      })
    })
  });
  const activation = await activationPayments.activateLicense({ licenseKey: ' LIC-123 ' });
  assert.strictEqual(activation.subscription.plan, PLAN_PRO);
  assert.strictEqual(activation.subscription.licenseKey, 'LIC-123');

  const failingPayments = createPaymentClient({
    env: { CLIPLY_PAYMENT_API_URL: 'https://pay.example.test' },
    fetchImpl: async () => ({
      ok: false,
      status: 402,
      json: async () => ({ error: 'Payment required' })
    })
  });
  await assert.rejects(
    () => failingPayments.activateLicense({ licenseKey: 'BAD' }),
    /Payment required/
  );
}

async function testPaymentServer() {
  const server = createPaymentServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const paymentClient = createPaymentClient({
      env: {
        CLIPLY_PAYMENT_API_URL: baseUrl,
        CLIPLY_DEVICE_ID: 'device-local-test'
      }
    });
    const checkout = await paymentClient.createCheckout({ email: 'user@example.com' });
    assert.strictEqual(checkout.checkoutUrl, 'http://localhost:8787/checkout');
    const activation = await paymentClient.activateLicense({ licenseKey: TEST_LICENSE_KEY });
    assert.strictEqual(activation.subscription.plan, PLAN_PRO);
    assert.strictEqual(activation.subscription.licenseKey, TEST_LICENSE_KEY);
    await assert.rejects(
      () => paymentClient.activateLicense({ licenseKey: 'BAD' }),
      /Invalid test license key/
    );
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

const indexHtml = fs.readFileSync('./src/renderer/index.html', 'utf8');
const rendererJs = fs.readFileSync('./src/renderer/renderer.js', 'utf8');
const mainJs = fs.readFileSync('./src/main.js', 'utf8');
const preloadJs = fs.readFileSync('./src/preload.js', 'utf8');

assert.ok(indexHtml.includes('id="launchOnStartupToggle"'));
assert.ok(rendererJs.includes('launchOnStartupToggle: document.getElementById'));
assert.ok(rendererJs.includes('launchOnStartup: el.launchOnStartupToggle.checked'));
assert.ok(mainJs.includes("const STATE_FILE = 'clipboard-lite-state.json'"));
assert.ok(mainJs.includes('state.history = Array.isArray(parsed.history)'));
assert.ok(mainJs.includes('fs.renameSync(tmpPath, statePath)'));
assert.ok(mainJs.includes("require('./paymentClient')"));
assert.ok(mainJs.includes("clipboard-lite:create-checkout"));
assert.ok(mainJs.includes("clipboard-lite:activate-license"));
assert.ok(mainJs.includes("clipboard-lite:refresh-subscription"));
assert.ok(preloadJs.includes('createCheckout:'));
assert.ok(preloadJs.includes('activateLicense:'));
assert.ok(preloadJs.includes('refreshSubscription:'));
assert.ok(!preloadJs.includes('upgradeToPro:'));
assert.ok(!mainJs.includes("clipboard-lite:upgrade-to-pro"));
assert.ok(indexHtml.includes('id="checkoutEmailInput"'));
assert.ok(indexHtml.includes('id="openCheckoutBtn"'));
assert.ok(indexHtml.includes('id="licenseKeyInput"'));
assert.ok(indexHtml.includes('id="activateLicenseBtn"'));
assert.ok(rendererJs.includes('api.createCheckout'));
assert.ok(rendererJs.includes('api.activateLicense'));
assert.ok(!rendererJs.includes('api.upgradeToPro'));
assert.ok(!indexHtml.includes('模拟充值并解锁 Pro'));
assert.ok(indexHtml.includes('常用文案'));
assert.ok(indexHtml.includes('标题'));
assert.ok(indexHtml.includes('内容'));
assert.ok(indexHtml.includes('保存文案'));
assert.ok(indexHtml.includes('点击复制后手动粘贴'));
assert.ok(indexHtml.includes('授权码'));
assert.ok(!indexHtml.includes('>模板 <'));
assert.ok(!indexHtml.includes('保存模板'));
assert.ok(!indexHtml.includes('Templates'));
assert.ok(!indexHtml.includes('<span>Title</span>'));
assert.ok(!indexHtml.includes('Save template'));
assert.ok(!indexHtml.includes('Example: support reply'));
assert.ok(!indexHtml.includes('Save common phrases'));
assert.ok(!rendererJs.includes('Upgrade to Pro'));
assert.ok(!rendererJs.includes('Template copied'));
assert.ok(!rendererJs.includes('Backup exported'));
assert.ok(DEFAULT_LOCAL_PAYMENT_API_URL === 'http://localhost:8787');

Promise.all([
  testPaymentClient(),
  testPaymentServer()
]).then(() => {
  console.log('tests passed');
}).catch(error => {
  console.error(error);
  process.exit(1);
});
