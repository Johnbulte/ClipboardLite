# Qt/QML Native Rewrite 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在不破坏现有 Electron 版本的前提下，新增 `qt/` 原生 Qt 6 + C++ + QML 应用骨架，逐步重写 Cliply 的剪贴板历史、托盘、快捷面板和现代 UI。

**架构：** C++ 负责系统集成、数据模型、分类和持久化；QML 负责主窗口和快捷面板视觉表现。第一阶段先提交可构建骨架、内容分类测试、主窗口 UI 原型和 QML 数据模型桥接。

**技术栈：** Qt 6、CMake、C++17、Qt Quick/QML、Qt Test、后续使用 SQLite、Windows API。

---

## 文件结构

- `qt/CMakeLists.txt`：Qt 原生项目入口，声明 app、测试、QML 模块。
- `qt/src/main.cpp`：应用启动入口，加载 QML。
- `qt/src/core/ContentClassifier.h|cpp`：剪贴板内容类型识别，先覆盖文本/链接/邮箱/颜色/代码/表格。
- `qt/src/core/ClipboardItem.h`：历史项轻量值对象。
- `qt/src/models/HistoryModel.h|cpp`：暴露给 QML 的历史列表模型。
- `qt/qml/Main.qml`：主窗口 UI，延续当前三栏布局并使用更现代的卡片视觉。
- `qt/qml/components/*.qml`：拆分侧栏、历史列表、详情面板。
- `qt/tests/tst_content_classifier.cpp`：分类逻辑测试。
- `qt/README.md`：Qt 版本构建与当前阶段说明。

## 任务 1：建立 Qt/QML 项目骨架

**文件：**
- 创建：`qt/CMakeLists.txt`
- 创建：`qt/src/main.cpp`
- 创建：`qt/qml/Main.qml`
- 创建：`qt/README.md`

- [ ] **步骤 1：创建 CMake 工程**

声明 Qt 6 Quick/Test 依赖、QML 模块和测试目标。

- [ ] **步骤 2：创建最小 QML 启动入口**

`main.cpp` 初始化 `QGuiApplication`、注册模型上下文并加载 `Main.qml`。

- [ ] **步骤 3：创建主窗口视觉骨架**

主窗口采用左侧分类栏、中间历史列表、右侧详情栏。

## 任务 2：以 TDD 实现内容分类

**文件：**
- 创建：`qt/tests/tst_content_classifier.cpp`
- 创建：`qt/src/core/ContentClassifier.h`
- 创建：`qt/src/core/ContentClassifier.cpp`

- [ ] **步骤 1：编写失败测试**

覆盖纯文本、URL、邮箱、颜色、代码、TSV 表格。

- [ ] **步骤 2：实现最少分类逻辑**

使用正则和轻量行列判断实现 `ContentClassifier::classifyText()`。

- [ ] **步骤 3：运行测试**

运行：`cmake --build qt/build && ctest --test-dir qt/build --output-on-failure`

当前机器未发现 CMake/Qt 工具链时，记录阻塞并保留源码。

## 任务 3：建立 QML 历史模型桥接

**文件：**
- 创建：`qt/src/core/ClipboardItem.h`
- 创建：`qt/src/models/HistoryModel.h`
- 创建：`qt/src/models/HistoryModel.cpp`
- 修改：`qt/src/main.cpp`
- 修改：`qt/qml/Main.qml`

- [ ] **步骤 1：定义历史项角色**

角色包括 `id`、`preview`、`value`、`type`、`favorite`、`pinned`、`updatedAt`。

- [ ] **步骤 2：提供演示数据**

在 Qt 骨架阶段使用内存数据驱动 UI，后续替换为剪贴板和 SQLite。

- [ ] **步骤 3：QML 使用模型渲染列表和详情**

点击历史项后更新右侧详情。

## 任务 4：验证与交付

**文件：**
- 修改：`qt/README.md`

- [ ] **步骤 1：检查工具链**

运行 `cmake --version`、`qmake --version` 或 Qt Creator Kit 检查。

- [ ] **步骤 2：能构建则执行测试**

运行 CMake 配置、构建、CTest。

- [ ] **步骤 3：不能构建则记录明确缺口**

说明需要安装 Qt 6、CMake、MSVC 或 MinGW Kit。
