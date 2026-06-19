# Cliply Qt

这是 Cliply 的 Qt 6 + C++ + QML 原生版本。

## 当前能力

- Qt Quick/QML 主窗口和快捷面板
- C++ 历史模型桥接到 QML
- 剪贴板文本、图片和文件路径采集
- 搜索、分类、收藏、置顶、删除、清空
- 托盘、全局快捷键和向前台窗口粘贴
- 历史记录保留限制：普通版最多 100 条，Pro 最多 2000 条

## 构建

需要 Qt 6、CMake 和 C++ Kit。当前机器可使用：

```powershell
$env:Path = 'C:\Qt\Tools\mingw1310_64\bin;C:\Qt\6.11.1\mingw_64\bin;C:\Qt\Tools\CMake_64\bin;' + $env:Path
cmake --build qt\build
ctest --test-dir qt\build --output-on-failure
```

也可以在 Qt Creator 中打开 `qt/CMakeLists.txt`。
