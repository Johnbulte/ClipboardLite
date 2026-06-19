# 支付激活第一版实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将当前“模拟充值并解锁 Pro”替换为可接真实支付服务的外部结账与授权激活链路。

**架构：** 桌面端不保存支付密钥，只持久化授权状态。主进程通过可配置的授权服务地址创建结账链接、验证 license key，并刷新订阅；渲染层只打开外部支付页并展示激活入口。无服务地址时返回明确的配置错误，避免误以为已经真实支付。

**技术栈：** Electron main/preload/renderer，Node 内置 `fetch`，Node 测试脚本。

---

## 文件职责

- `src/paymentClient.js`：封装授权服务 URL 读取、设备 ID 生成、创建结账、激活 license、刷新订阅、错误归一化。
- `src/main.js`：替换模拟升级 IPC，新增 checkout/license/refresh IPC，成功激活后沿用现有 Pro 状态落库与广播。
- `src/preload.js`：暴露支付激活 API 给渲染层。
- `src/renderer/index.html`：升级弹窗加入 license 输入和“打开支付页”按钮。
- `src/renderer/renderer.js`：调用新支付 API，处理未配置服务、打开外部结账页、激活成功刷新 UI。
- `test-table-parser.js`：增加 payment client 单元测试，覆盖未配置、请求 payload、激活成功、错误归一化。

## 任务 1：支付客户端

**文件：**
- 创建：`src/paymentClient.js`
- 修改：`test-table-parser.js`

- [ ] **步骤 1：编写失败测试**

在 `test-table-parser.js` 中加入对 `createPaymentClient` 的断言：

```js
const { createPaymentClient } = require('./src/paymentClient');

const unconfiguredPayments = createPaymentClient({ env: {} });
assert.strictEqual(unconfiguredPayments.isConfigured(), false);
assert.rejects(
  () => unconfiguredPayments.createCheckout({ email: 'user@example.com' }),
  /Payment service is not configured/
);
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`
预期：FAIL，报错为找不到 `./src/paymentClient` 或缺少 `createPaymentClient`。

- [ ] **步骤 3：实现最小支付客户端**

创建 `src/paymentClient.js`，提供：
- `createPaymentClient({ env, fetchImpl, now })`
- `isConfigured()`
- `getDeviceId()`
- `createCheckout({ email })`
- `activateLicense({ licenseKey })`
- `refreshSubscription({ licenseKey })`

服务端约定：
- `POST /v1/checkout`，payload：`{ product: "cliply-pro", email, deviceId }`，返回 `{ checkoutUrl }`
- `POST /v1/licenses/activate`，payload：`{ licenseKey, deviceId }`，返回 `{ subscription }`
- `POST /v1/licenses/refresh`，payload：`{ licenseKey, deviceId }`，返回 `{ subscription }`

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：PASS。

## 任务 2：主进程授权状态

**文件：**
- 修改：`src/main.js`
- 修改：`src/preload.js`
- 修改：`test-table-parser.js`

- [ ] **步骤 1：编写失败测试**

在 `test-table-parser.js` 中读取源码，断言：

```js
assert.ok(mainJs.includes("require('./paymentClient')"));
assert.ok(mainJs.includes("clipboard-lite:create-checkout"));
assert.ok(mainJs.includes("clipboard-lite:activate-license"));
assert.ok(mainJs.includes("clipboard-lite:refresh-subscription"));
assert.ok(preloadJs.includes('createCheckout:'));
assert.ok(preloadJs.includes('activateLicense:'));
assert.ok(preloadJs.includes('refreshSubscription:'));
assert.ok(!preloadJs.includes('upgradeToPro:'));
assert.ok(!mainJs.includes("clipboard-lite:upgrade-to-pro"));
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`
预期：FAIL，现有代码仍含模拟充值 IPC。

- [ ] **步骤 3：实现 IPC**

在主进程初始化 `paymentClient`，新增：
- `clipboard-lite:create-checkout`
- `clipboard-lite:activate-license`
- `clipboard-lite:refresh-subscription`

激活/刷新返回 Pro 订阅时，统一调用 `applySubscription(subscription)`：
- 写入 `state.subscription`
- Pro 时开启历史上限、敏感保护默认项
- 保存、广播

删除 `clipboard-lite:upgrade-to-pro`。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：PASS。

## 任务 3：渲染层支付 UI

**文件：**
- 修改：`src/renderer/index.html`
- 修改：`src/renderer/renderer.js`
- 修改：`test-table-parser.js`

- [ ] **步骤 1：编写失败测试**

断言 HTML/JS 包含：

```js
assert.ok(indexHtml.includes('id="checkoutEmailInput"'));
assert.ok(indexHtml.includes('id="openCheckoutBtn"'));
assert.ok(indexHtml.includes('id="licenseKeyInput"'));
assert.ok(indexHtml.includes('id="activateLicenseBtn"'));
assert.ok(rendererJs.includes('api.createCheckout'));
assert.ok(rendererJs.includes('api.activateLicense'));
assert.ok(!rendererJs.includes('api.upgradeToPro'));
assert.ok(!indexHtml.includes('模拟充值并解锁 Pro'));
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`
预期：FAIL，当前 UI 仍是模拟充值。

- [ ] **步骤 3：实现 UI 行为**

升级弹窗按钮改为：
- 邮箱输入：用于创建 checkout
- “打开支付页”：调用 `api.createCheckout({ email })`，成功后 `api.openExternal(checkoutUrl)`
- license 输入：支付完成后粘贴 license key
- “激活 Pro”：调用 `api.activateLicense({ licenseKey })`

错误提示：
- 未配置服务：提示“请先配置 CLIPLY_PAYMENT_API_URL”
- 网络/服务错误：展示服务端错误消息

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：PASS。

## 任务 4：最终验证

**文件：**
- 不新增文件

- [ ] **步骤 1：语法检查**

运行：

```bash
node --check src/paymentClient.js
node --check src/main.js
node --check src/preload.js
node --check src/renderer/renderer.js
```

预期：全部 exit 0。

- [ ] **步骤 2：测试**

运行：`npm test`
预期：输出 `tests passed`。

- [ ] **步骤 3：查看 diff**

运行：`git diff -- src/paymentClient.js src/main.js src/preload.js src/renderer/index.html src/renderer/renderer.js test-table-parser.js docs/superpowers/plans/2026-06-19-payment-activation.md`

预期：只包含支付激活相关变更。
