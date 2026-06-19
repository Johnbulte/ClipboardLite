# Pro 功能拆分实现计划

目标：将 Cliply 的高级能力拆为 Pro，普通版保留收藏、置顶、全局快捷键；未充值访问 Pro 功能时展示升级与版本对比。

架构：新增 entitlement 模块作为主进程和渲染层共用的权限判定来源；主进程在数据采集、IPC 能力、设置保存处执行真实限制；渲染层只负责提示、锁定按钮和展示对比。

技术栈：Electron main/preload/renderer，Node 测试脚本。

## 文件职责
- `src/entitlements.js`：定义 free/pro 权限、Pro 功能清单、版本对比、升级状态判断。
- `src/main.js`：初始化订阅状态；限制 Pro 类型采集、Pro IPC、普通版历史上限。
- `src/preload.js`：暴露订阅 API 与升级 API。
- `src/renderer/index.html` / `styles.css` / `renderer.js`：新增升级弹窗、Pro badge、功能锁提示。
- `test-table-parser.js`：扩展为同时验证 entitlement 行为。

## 任务
1. 先写 entitlement 测试，验证普通版/Pro 权限矩阵和版本对比。
2. 实现 `src/entitlements.js`，跑测试通过。
3. 主进程接入权限：默认 free，模拟升级 pro，Pro IPC 未授权返回 false，普通版过滤高级采集类型并限制历史数量。
4. 渲染层接入：展示当前版本，Pro 功能未授权时打开对比弹窗；保留普通版收藏、置顶、全局快捷键。
5. 运行测试和基础语法检查。
