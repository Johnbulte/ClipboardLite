#include "core/ContentClassifier.h"
#include "models/HistoryFilterModel.h"
#include "models/HistoryModel.h"

#include <QDateTime>
#include <QAction>
#include <QApplication>
#include <QClipboard>
#include <QAbstractNativeEventFilter>
#include <QCursor>
#include <QMenu>
#include <QMimeData>
#include <QImage>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickWindow>
#include <QScreen>
#include <QStringList>
#include <QSystemTrayIcon>
#include <QTimer>
#include <QUrl>

#ifdef Q_OS_WIN
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

static bool isImageFilePath(const QString &path)
{
    const QString lower = path.toLower();
    return lower.endsWith(QStringLiteral(".png"))
        || lower.endsWith(QStringLiteral(".jpg"))
        || lower.endsWith(QStringLiteral(".jpeg"))
        || lower.endsWith(QStringLiteral(".gif"))
        || lower.endsWith(QStringLiteral(".bmp"))
        || lower.endsWith(QStringLiteral(".webp"));
}

static bool addClipboardMimeData(HistoryModel &historyModel, const QMimeData *mimeData)
{
    if (!mimeData) {
        return false;
    }

    if (mimeData->hasImage()) {
        historyModel.addImagePath(QStringLiteral("剪贴板图片"));
        return true;
    }

    for (const QUrl &url : mimeData->urls()) {
        const QString path = url.isLocalFile() ? url.toLocalFile() : url.toString();
        if (isImageFilePath(path)) {
            historyModel.addImagePath(path);
            return true;
        }
    }

    const QString text = mimeData->text().trimmed();
    if (text.startsWith(QStringLiteral("file://"), Qt::CaseInsensitive)) {
        const QString path = QUrl(text).toLocalFile();
        if (isImageFilePath(path)) {
            historyModel.addImagePath(path);
            return true;
        }
    }

    historyModel.addText(text);
    return !text.isEmpty();
}

static bool addClipboardMimeDataV2(HistoryModel &historyModel, const QMimeData *mimeData)
{
    if (!mimeData) {
        return false;
    }

    for (const QUrl &url : mimeData->urls()) {
        const QString path = url.isLocalFile() ? url.toLocalFile() : url.toString();
        if (isImageFilePath(path)) {
            historyModel.addImagePath(path);
            return true;
        }
    }

    const QString text = mimeData->text().trimmed();
    if (text.startsWith(QStringLiteral("file://"), Qt::CaseInsensitive)) {
        const QString path = QUrl(text).toLocalFile();
        if (isImageFilePath(path)) {
            historyModel.addImagePath(path);
            return true;
        }
    }

    if (mimeData->hasImage()) {
        const QImage image = qvariant_cast<QImage>(mimeData->imageData());
        historyModel.addImage(image);
        return !image.isNull();
    }

    historyModel.addText(text);
    return !text.isEmpty();
}
#include <windows.h>
#endif

class GlobalShortcutFilter final : public QAbstractNativeEventFilter {
public:
    explicit GlobalShortcutFilter(std::function<void()> activated)
        : m_activated(std::move(activated))
    {
    }

    bool registerShortcut(UINT modifiers = MOD_CONTROL | MOD_SHIFT, UINT key = 'V')
    {
#ifdef Q_OS_WIN
        m_modifiers = modifiers;
        m_key = key;
        return RegisterHotKey(nullptr, m_hotkeyId, m_modifiers, m_key);
#else
        Q_UNUSED(modifiers);
        Q_UNUSED(key);
        return false;
#endif
    }

    void unregisterShortcut()
    {
#ifdef Q_OS_WIN
        UnregisterHotKey(nullptr, m_hotkeyId);
#endif
    }

    bool nativeEventFilter(const QByteArray &, void *message, qintptr *) override
    {
#ifdef Q_OS_WIN
        const auto msg = static_cast<MSG *>(message);
        if (msg->message == WM_HOTKEY && static_cast<int>(msg->wParam) == m_hotkeyId) {
            if (m_activated) {
                m_activated();
            }
            return true;
        }
#else
        Q_UNUSED(message);
#endif
        return false;
    }

private:
    static constexpr int m_hotkeyId = 0x434C4950;
    std::function<void()> m_activated;
#ifdef Q_OS_WIN
    UINT m_modifiers = MOD_CONTROL | MOD_SHIFT;
    UINT m_key = 'V';
#endif
};

class ShortcutController final : public QObject {
    Q_OBJECT

public:
    explicit ShortcutController(GlobalShortcutFilter *filter, QObject *parent = nullptr)
        : QObject(parent)
        , m_filter(filter)
    {
    }

public slots:
    bool setShortcut(const QString &shortcut)
    {
        if (!m_filter) {
            return false;
        }

        UINT modifiers = 0;
        UINT key = 0;
        if (!parseShortcut(shortcut, modifiers, key)) {
            return false;
        }

        m_filter->unregisterShortcut();
        if (!m_filter->registerShortcut(modifiers, key)) {
            m_filter->registerShortcut();
            return false;
        }
        m_shortcut = shortcut;
        return true;
    }

    QString shortcut() const
    {
        return m_shortcut;
    }

private:
    static bool parseShortcut(const QString &shortcut, UINT &modifiers, UINT &key)
    {
#ifdef Q_OS_WIN
        const QStringList parts = shortcut.split(QLatin1Char('+'), Qt::SkipEmptyParts);
        if (parts.isEmpty()) {
            return false;
        }

        for (const QString &rawPart : parts) {
            const QString part = rawPart.trimmed().toUpper();
            if (part == QLatin1String("CTRL")) {
                modifiers |= MOD_CONTROL;
            } else if (part == QLatin1String("SHIFT")) {
                modifiers |= MOD_SHIFT;
            } else if (part == QLatin1String("ALT")) {
                modifiers |= MOD_ALT;
            } else if (part == QLatin1String("WIN")) {
                modifiers |= MOD_WIN;
            } else if (part.size() == 1 && part.at(0).isLetterOrNumber()) {
                key = part.at(0).toLatin1();
            } else if (part.startsWith(QLatin1Char('F'))) {
                bool ok = false;
                const int number = part.mid(1).toInt(&ok);
                if (ok && number >= 1 && number <= 12) {
                    key = VK_F1 + static_cast<UINT>(number - 1);
                }
            } else if (part == QLatin1String("SPACE")) {
                key = VK_SPACE;
            } else if (part == QLatin1String("TAB")) {
                key = VK_TAB;
            } else if (part == QLatin1String("ENTER")) {
                key = VK_RETURN;
            } else if (part == QLatin1String("ESC")) {
                key = VK_ESCAPE;
            } else if (part == QLatin1String("BACKSPACE")) {
                key = VK_BACK;
            } else if (part == QLatin1String("DELETE")) {
                key = VK_DELETE;
            } else if (part == QLatin1String("INSERT")) {
                key = VK_INSERT;
            } else if (part == QLatin1String("HOME")) {
                key = VK_HOME;
            } else if (part == QLatin1String("END")) {
                key = VK_END;
            } else if (part == QLatin1String("PAGEUP")) {
                key = VK_PRIOR;
            } else if (part == QLatin1String("PAGEDOWN")) {
                key = VK_NEXT;
            } else if (part == QLatin1String("LEFT")) {
                key = VK_LEFT;
            } else if (part == QLatin1String("RIGHT")) {
                key = VK_RIGHT;
            } else if (part == QLatin1String("UP")) {
                key = VK_UP;
            } else if (part == QLatin1String("DOWN")) {
                key = VK_DOWN;
            }
        }

        return modifiers != 0 && key != 0;
#else
        Q_UNUSED(shortcut);
        Q_UNUSED(modifiers);
        Q_UNUSED(key);
        return false;
#endif
    }

    GlobalShortcutFilter *m_filter = nullptr;
    QString m_shortcut = QStringLiteral("Ctrl+Shift+V");
};

static void showWindow(QWindow *window)
{
    if (!window) {
        return;
    }
    window->show();
    window->raise();
    window->requestActivate();
}

static void showQuickPanel(QWindow *window)
{
    if (!window) {
        return;
    }

    const QPoint cursor = QCursor::pos();
    QScreen *screen = QGuiApplication::screenAt(cursor);
    if (!screen) {
        screen = QGuiApplication::primaryScreen();
    }
    const QRect area = screen ? screen->availableGeometry() : QRect(0, 0, 1280, 720);
    const QSize size = window->size().isValid() ? window->size() : QSize(430, 560);
    const int x = std::clamp(cursor.x() - size.width() / 2, area.left() + 12, area.right() - size.width() + 1 - 12);
    const int y = std::clamp(cursor.y() + 14, area.top() + 12, area.bottom() - size.height() + 1 - 12);

    window->setPosition(x, y);
    showWindow(window);
}

static void sendPasteShortcut()
{
#ifdef Q_OS_WIN
    INPUT inputs[4] = {};

    inputs[0].type = INPUT_KEYBOARD;
    inputs[0].ki.wVk = VK_CONTROL;

    inputs[1].type = INPUT_KEYBOARD;
    inputs[1].ki.wVk = 'V';

    inputs[2].type = INPUT_KEYBOARD;
    inputs[2].ki.wVk = 'V';
    inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

    inputs[3].type = INPUT_KEYBOARD;
    inputs[3].ki.wVk = VK_CONTROL;
    inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

    SendInput(4, inputs, sizeof(INPUT));
#endif
}

class PasteDispatcher final : public QObject {
    Q_OBJECT

public:
    explicit PasteDispatcher(QObject *parent = nullptr)
        : QObject(parent)
    {
    }

public slots:
    void requestPaste()
    {
        QTimer::singleShot(80, [] {
            sendPasteShortcut();
        });
    }
};

static ClipboardItem makeDemoItem(const QString &id, const QString &value)
{
    const auto type = ContentClassifier::classifyText(value);
    QString preview = value.simplified();
    if (preview.size() > 120) {
        preview = preview.left(117) + QStringLiteral("...");
    }

    return ClipboardItem {
        id,
        preview,
        value,
        ContentClassifier::typeName(type),
        QImage {},
        QString {},
        false,
        false,
        QDateTime::currentDateTime()
    };
}

int main(int argc, char *argv[])
{
    qputenv("QT_QUICK_CONTROLS_STYLE", "Basic");

    QApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("Cliply"));
    app.setOrganizationName(QStringLiteral("Cliply"));
    QApplication::setQuitOnLastWindowClosed(false);

    HistoryModel historyModel;
    historyModel.addItem(makeDemoItem(QStringLiteral("demo-2"), QStringLiteral("基础功能永久免费")));
    historyModel.addItem(makeDemoItem(QStringLiteral("demo-3"), QStringLiteral("可以识别代码和链接")));
    historyModel.addItem(makeDemoItem(QStringLiteral("demo-4"), QStringLiteral("ctrl+shift+v可调出快捷窗口")));
    historyModel.addItem(makeDemoItem(QStringLiteral("demo-5"), QStringLiteral("这是来自 Qt/QML 原生版本的剪贴板历史示例。")));

    HistoryFilterModel historyFilterModel;
    historyFilterModel.setSourceModel(&historyModel);

    QObject::connect(QGuiApplication::clipboard(), &QClipboard::dataChanged, &historyModel, [&historyModel] {
        addClipboardMimeDataV2(historyModel, QGuiApplication::clipboard()->mimeData());
    });

    QWindow *mainWindow = nullptr;
    QWindow *quickPanel = nullptr;

    GlobalShortcutFilter shortcutFilter([&quickPanel] {
        showQuickPanel(quickPanel);
    });

    ShortcutController shortcutController(&shortcutFilter);

    QQmlApplicationEngine engine;
    engine.rootContext()->setContextProperty(QStringLiteral("historyModel"), &historyModel);
    engine.rootContext()->setContextProperty(QStringLiteral("historyFilterModel"), &historyFilterModel);
    engine.rootContext()->setContextProperty(QStringLiteral("shortcutController"), &shortcutController);

    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, [] {
        QCoreApplication::exit(-1);
    }, Qt::QueuedConnection);

    engine.loadFromModule(QStringLiteral("Cliply"), QStringLiteral("Main"));
    engine.loadFromModule(QStringLiteral("Cliply"), QStringLiteral("QuickPanel"));

    for (QObject *object : engine.rootObjects()) {
        if (object->objectName() == QStringLiteral("mainWindow")) {
            mainWindow = qobject_cast<QWindow *>(object);
        } else if (object->objectName() == QStringLiteral("quickPanelWindow")) {
            quickPanel = qobject_cast<QWindow *>(object);
        }
    }

    if (quickPanel) {
        auto *pasteDispatcher = new PasteDispatcher(quickPanel);
        QObject::connect(quickPanel, SIGNAL(pasteRequested()), pasteDispatcher, SLOT(requestPaste()));
    }

    QSystemTrayIcon trayIcon;
    trayIcon.setIcon(QIcon::fromTheme(QStringLiteral("edit-paste")));
    trayIcon.setToolTip(QStringLiteral("Cliply"));

    QMenu trayMenu;
    QAction *openQuickPanelAction = trayMenu.addAction(QStringLiteral("打开剪贴板历史(&V)"));
    QAction *openMainWindowAction = trayMenu.addAction(QStringLiteral("打开主窗口"));
    trayMenu.addSeparator();
    QAction *quitAction = trayMenu.addAction(QStringLiteral("退出"));
    trayIcon.setContextMenu(&trayMenu);
    trayIcon.show();

    QObject::connect(openQuickPanelAction, &QAction::triggered, &app, [quickPanel] {
        showQuickPanel(quickPanel);
    });
    QObject::connect(openMainWindowAction, &QAction::triggered, &app, [mainWindow] {
        showWindow(mainWindow);
    });
    QObject::connect(quitAction, &QAction::triggered, &app, &QCoreApplication::quit);
    QObject::connect(&trayIcon, &QSystemTrayIcon::activated, &app, [quickPanel](QSystemTrayIcon::ActivationReason reason) {
        if (reason == QSystemTrayIcon::DoubleClick || reason == QSystemTrayIcon::Trigger) {
            showQuickPanel(quickPanel);
        }
    });

    app.installNativeEventFilter(&shortcutFilter);
    shortcutFilter.registerShortcut();

    QObject::connect(&app, &QCoreApplication::aboutToQuit, &app, [&shortcutFilter] {
        shortcutFilter.unregisterShortcut();
    });

    return app.exec();
}

#include "main.moc"
