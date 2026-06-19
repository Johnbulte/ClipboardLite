# Cliply Qt

Cliply 是一个 Qt/QML 原生桌面剪贴板历史工具。当前项目以 `qt/` 为主项目，旧 Electron 实现已移除。

## 已实现

- 监听剪贴板文本、图片和文件路径
- 本地历史列表、搜索、分类、收藏、置顶、删除和清空
- 快捷面板与全局快捷键
- 设置页支持开机启动、自定义快捷键、监听开关
- 历史记录保留数量限制：
  - 普通版最多 100 条
  - Pro 最多 2000 条

## 构建与测试

确保 Qt / MinGW / CMake 在 PATH 中，或按本机安装路径临时设置：

```powershell
$env:Path = 'C:\Qt\Tools\mingw1310_64\bin;C:\Qt\6.11.1\mingw_64\bin;C:\Qt\Tools\CMake_64\bin;' + $env:Path
cmake --build qt\build
ctest --test-dir qt\build --output-on-failure
```

## 项目结构

- `qt/src/`：C++ 应用入口、剪贴板集成、历史模型和过滤模型
- `qt/qml/`：Qt Quick/QML 界面
- `qt/tests/`：Qt Test 单元和契约测试
- `docs/`：开发计划与过程文档
