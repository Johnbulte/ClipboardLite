#include <QtTest/QtTest>

#include <QFile>
#include <QString>

class DesktopIntegrationContractTest : public QObject {
    Q_OBJECT

private slots:
    void mainRegistersTrayShortcutAndBackgroundWindow();
    void quickPanelQmlExistsAndStartsHidden();
    void quickPanelPastesSelectionAndUsesRoundedSearch();
    void quickPanelDisplaysImageThumbnails();
    void historyListProvidesTypeLabelsAndContextMenu();
    void mainWindowAdaptsToNarrowWidthsAndShowsCopyToast();
    void settingsKeepInfrequentControlsAndHistoryLimit();
    void settingsShortcutCanBeCustomizedAndProBadgeStaysOnMainPage();
    void proComparisonDialogExposesPlanDifferencesAndShimmer();
    void proComparisonDialogUsesBlackGoldContainedDesign();
    void mainWindowOpensProComparisonFromUpgradeEntrypoints();
};

static QString readTextFile(const QString &path)
{
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return {};
    }
    return QString::fromUtf8(file.readAll());
}

void DesktopIntegrationContractTest::mainRegistersTrayShortcutAndBackgroundWindow()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/src/main.cpp"));

    QVERIFY2(source.contains(QStringLiteral("QSystemTrayIcon")), "Qt app must create a system tray icon.");
    QVERIFY2(source.contains(QStringLiteral("setQuitOnLastWindowClosed(false)")), "Qt app must keep running after windows close.");
    QVERIFY2(source.contains(QStringLiteral("RegisterHotKey")), "Windows build must register a global shortcut.");
    QVERIFY2(source.contains(QStringLiteral("setShortcut")), "Global shortcut must be configurable from QML.");
    QVERIFY2(source.contains(QStringLiteral("parseShortcut")), "Global shortcut registration must parse shortcut strings.");
    QVERIFY2(source.contains(QStringLiteral("QuickPanel")), "Main process must load the compact quick panel.");
}

void DesktopIntegrationContractTest::quickPanelQmlExistsAndStartsHidden()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/QuickPanel.qml"));

    QVERIFY2(source.contains(QStringLiteral("ApplicationWindow")), "QuickPanel.qml must define a window.");
    QVERIFY2(source.contains(QStringLiteral("visible: false")), "Quick panel must start hidden.");
    QVERIFY2(source.contains(QStringLiteral("Ctrl+Shift+V")), "Quick panel must document the global shortcut.");
    QVERIFY2(source.contains(QStringLiteral("historyFilterModel")), "Quick panel must show clipboard history.");
}

void DesktopIntegrationContractTest::quickPanelPastesSelectionAndUsesRoundedSearch()
{
    const QString qmlSource = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/QuickPanel.qml"));
    const QString cppSource = readTextFile(QStringLiteral(SOURCE_ROOT "/src/main.cpp"));

    QVERIFY2(qmlSource.contains(QStringLiteral("background: Rectangle")), "Quick panel search field must use a custom background.");
    QVERIFY2(qmlSource.contains(QStringLiteral("radius:")), "Quick panel search field background must define rounded corners.");
    QVERIFY2(qmlSource.contains(QStringLiteral("historyFilterModel.pasteItem(selectedRow)")), "Enter/double-click must paste the selection.");
    QVERIFY2(cppSource.contains(QStringLiteral("sendPasteShortcut")), "Qt app must provide a native paste shortcut helper.");
    QVERIFY2(cppSource.contains(QStringLiteral("SendInput")), "Windows build must send Ctrl+V to the previously focused app.");
}

void DesktopIntegrationContractTest::quickPanelDisplaysImageThumbnails()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/QuickPanel.qml"));

    QVERIFY2(source.contains(QStringLiteral("required property string thumbnail")), "Quick panel rows must read thumbnail data from history model.");
    QVERIFY2(source.contains(QStringLiteral("type === \"image\"")), "Quick panel must detect image rows before rendering thumbnails.");
    QVERIFY2(source.contains(QStringLiteral("source: thumbnail")), "Quick panel thumbnail image must use the model thumbnail data URL.");
    QVERIFY2(source.contains(QStringLiteral("fillMode: Image.PreserveAspectCrop")), "Quick panel thumbnails must crop predictably.");
}

void DesktopIntegrationContractTest::historyListProvidesTypeLabelsAndContextMenu()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/components/HistoryList.qml"));

    QVERIFY2(source.contains(QStringLiteral("Layout.preferredHeight: 46")), "Search field and copy button should share height.");
    QVERIFY2(source.contains(QStringLiteral("function typeLabel")), "History list must translate internal type keys.");
    QVERIFY2(source.contains(QStringLiteral("acceptedButtons: Qt.LeftButton | Qt.RightButton")), "History rows must accept right-click.");
    QVERIFY2(source.contains(QStringLiteral("id: contextPopup")), "History rows must expose a custom context menu.");
    QVERIFY2(source.contains(QStringLiteral("ContextAction")), "History rows must use styled context actions.");
    QVERIFY2(source.contains(QStringLiteral("radius: 18")), "Context popup must visually match rounded Cliply cards.");
    QVERIFY2(!source.contains(QStringLiteral("MenuItem")), "History rows must not use native unstyled menu items.");
}

void DesktopIntegrationContractTest::mainWindowAdaptsToNarrowWidthsAndShowsCopyToast()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/Main.qml"));

    QVERIFY2(source.contains(QStringLiteral("property bool compactLayout")), "Main window must expose a compact breakpoint.");
    QVERIFY2(source.contains(QStringLiteral("Layout.preferredWidth: root.compactLayout ? 0 :")), "Detail panel must collapse on narrow windows.");
    QVERIFY2(source.contains(QStringLiteral("function showCopyToast")), "Main window must provide reusable copy feedback.");
    QVERIFY2(source.contains(QStringLiteral("id: copyPopup")), "Main window must render a dedicated copy feedback popup.");
    QVERIFY2(source.contains(QStringLiteral("copyPopup.open()")), "Copy feedback helper must open the popup.");
    QVERIFY2(source.contains(QStringLiteral("id: copyToast")), "Main window must render a visible toast.");
}

void DesktopIntegrationContractTest::settingsKeepInfrequentControlsAndHistoryLimit()
{
    const QString mainSource = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/Main.qml"));
    const QString listSource = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/components/HistoryList.qml"));

    QVERIFY2(mainSource.contains(QStringLiteral("id: proBadgeButton")), "Pro badge must remain visible on the main page.");
    QVERIFY2(mainSource.contains(QStringLiteral("Ctrl+Shift+V")), "Settings must show the current global shortcut.");
    QVERIFY2(mainSource.contains(QStringLiteral("shortcutController.setShortcut(shortcut)")), "Settings shortcut must update the native global hotkey.");
    QVERIFY2(mainSource.contains(QStringLiteral("historyModel.clear()")), "Clear history must be available from settings.");
    QVERIFY2(mainSource.contains(QStringLiteral("保留历史记录")), "Settings must include a history retention selector.");
    QVERIFY2(mainSource.contains(QStringLiteral("historyModel.maxItems")), "History retention selector must bind to the model limit.");
    QVERIFY2(mainSource.contains(QStringLiteral("2000 条")), "Pro retention option must expose the 2000 item limit.");
    QVERIFY2(listSource.contains(QStringLiteral("id: contextPopup")), "History rows must keep a custom styled context popup.");
}

void DesktopIntegrationContractTest::settingsShortcutCanBeCustomizedAndProBadgeStaysOnMainPage()
{
    const QString mainSource = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/Main.qml"));

    QVERIFY2(mainSource.contains(QStringLiteral("id: proBadgeButton")), "Pro badge must remain visible on the main page.");
    QVERIFY2(mainSource.contains(QStringLiteral("property bool shortcutRecording")), "Settings shortcut control must support recording state.");
    QVERIFY2(mainSource.contains(QStringLiteral("Keys.onPressed")), "Settings shortcut control must capture keyboard input.");
    QVERIFY2(mainSource.contains(QStringLiteral("formatShortcut")), "Settings shortcut control must format custom key combinations.");
    QVERIFY2(mainSource.contains(QStringLiteral("root.globalShortcut = shortcut")), "Captured key combination must update the displayed shortcut.");
    QVERIFY2(mainSource.contains(QStringLiteral("text: root.globalShortcut")), "Shortcut pill must display the current shortcut.");
    QVERIFY2(mainSource.contains(QStringLiteral("id: shortcutRecorder")), "Shortcut recording must use a dedicated input.");
    QVERIFY2(mainSource.contains(QStringLiteral("shortcutRecorder.forceActiveFocus()")), "Shortcut button must focus the recorder input.");
    QVERIFY2(mainSource.contains(QStringLiteral("function isModifierOnlyKey")), "Shortcut recorder must distinguish modifier-only key presses.");
    QVERIFY2(mainSource.contains(QStringLiteral("function keyNameFromCode")), "Shortcut recorder must map Qt key codes to stable names.");
    QVERIFY2(!mainSource.contains(QStringLiteral("event.text.toUpperCase()")), "Shortcut display must not use event.text.");
    QVERIFY2(mainSource.contains(QStringLiteral("if (isModifierOnlyKey(event.key))")), "Modifier-only presses must not exit recording.");
    QVERIFY2(mainSource.contains(QStringLiteral("id: proBadgeBackground")), "Pro badge must expose a background for visual effects.");
    QVERIFY2(mainSource.contains(QStringLiteral("SequentialAnimation on x")), "Pro badge must include shimmer animation.");
}

void DesktopIntegrationContractTest::proComparisonDialogExposesPlanDifferencesAndShimmer()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/components/PlanComparisonDialog.qml"));

    QVERIFY2(source.contains(QStringLiteral("Popup")), "Plan comparison must be a reusable popup.");
    QVERIFY2(source.contains(QStringLiteral("property bool proEnabled")), "Plan comparison must receive the current entitlement state.");
    QVERIFY2(source.contains(QStringLiteral("普通版")), "Plan comparison must label the free plan.");
    QVERIFY2(source.contains(QStringLiteral("Pro")), "Plan comparison must label the Pro plan.");
    QVERIFY2(source.contains(QStringLiteral("100 条")), "Free plan must advertise the 100 item history limit.");
    QVERIFY2(source.contains(QStringLiteral("2000 条")), "Pro plan must advertise the 2000 item history limit.");
    QVERIFY2(source.contains(QStringLiteral("敏感内容保护")), "Plan comparison must include sensitive content protection.");
    QVERIFY2(source.contains(QStringLiteral("OCR 图片文字识别")), "Plan comparison must include OCR.");
    QVERIFY2(source.contains(QStringLiteral("JSON/表格/链接/文本处理")), "Plan comparison must include smart processing.");
    QVERIFY2(source.contains(QStringLiteral("自动规则")), "Plan comparison must include automation rules.");
    QVERIFY2(source.contains(QStringLiteral("按 App / 类型 / 时间高级筛选")), "Plan comparison must include advanced source filtering.");
    QVERIFY2(source.contains(QStringLiteral("SequentialAnimation on x")), "Pro card must include shimmer animation.");
    QVERIFY2(source.contains(QStringLiteral("signal upgradeRequested")), "Primary action must expose an upgrade signal.");
}

void DesktopIntegrationContractTest::proComparisonDialogUsesBlackGoldContainedDesign()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/components/PlanComparisonDialog.qml"));

    QVERIFY2(source.contains(QStringLiteral("property int cardRadius")), "Plan cards must share one radius token.");
    QVERIFY2(source.contains(QStringLiteral("color: \"#11100d\"")), "Pro card must use a black-gold base instead of the previous saturated gradient.");
    QVERIFY2(source.contains(QStringLiteral("#d8b76a")), "Pro card must use restrained gold accents.");
    QVERIFY2(source.contains(QStringLiteral("radius: parent.radius")), "Gradient layers must preserve rounded corners.");
    QVERIFY2(source.contains(QStringLiteral("ScrollView")), "Dialog content must be scroll-contained on smaller windows.");
    QVERIFY2(source.contains(QStringLiteral("id: planScroll")), "ScrollView must expose a stable id for layout bindings.");
    QVERIFY2(source.contains(QStringLiteral("width: planScroll.availableWidth")), "Plan grid must bind to the ScrollView width, not an unstable parent.");
    QVERIFY2(!source.contains(QStringLiteral("parent.availableWidth")), "Nested ScrollView content must not rely on parent.availableWidth.");
    QVERIFY2(source.contains(QStringLiteral("id: topGlow")), "Top decorative glow must be identifiable and constrained.");
    QVERIFY2(source.contains(QStringLiteral("id: bottomGlow")), "Bottom decorative glow must be identifiable and constrained.");
    QVERIFY2(source.contains(QStringLiteral("x: 18")), "Top decorative glow must stay inside the rounded dialog bounds.");
    QVERIFY2(source.contains(QStringLiteral("y: 14")), "Top decorative glow must stay inside the rounded dialog bounds.");
    QVERIFY2(source.contains(QStringLiteral("anchors.right: parent.right")), "Bottom decorative glow must be anchored inside the dialog.");
    QVERIFY2(source.contains(QStringLiteral("anchors.bottom: parent.bottom")), "Bottom decorative glow must be anchored inside the dialog.");
    QVERIFY2(!source.contains(QStringLiteral("x: -130")), "Decorative glows must not use negative x offsets that leak past rounded corners.");
    QVERIFY2(!source.contains(QStringLiteral("y: -120")), "Decorative glows must not use negative y offsets that leak past rounded corners.");
    QVERIFY2(!source.contains(QStringLiteral("parent.height - 210")), "Decorative glows must not compute edge-overlapping positions.");
    QVERIFY2(!source.contains(QStringLiteral("#ffffff20")), "Do not use RGBA-style #ffffff20 in Qt; it renders as opaque yellow.");
    QVERIFY2(!source.contains(QStringLiteral("#ffffff28")), "Do not use RGBA-style #ffffff28 in Qt; it renders as opaque yellow.");
    QVERIFY2(!source.contains(QStringLiteral("#ffffff2d")), "Do not use RGBA-style #ffffff2d in Qt; it renders as opaque yellow.");
    QVERIFY2(!source.contains(QStringLiteral("#ffffff77")), "Do not use RGBA-style #ffffff77 in Qt; alpha must be first in Qt colors.");
    QVERIFY2(!source.contains(QStringLiteral("#ff8a1f")), "The comparison Pro card must not use the old orange-purple-blue palette.");
    QVERIFY2(!source.contains(QStringLiteral("#7c3aed")), "The comparison Pro card must not use the old orange-purple-blue palette.");
    QVERIFY2(!source.contains(QStringLiteral("#2563eb")), "The comparison Pro card must not use the old orange-purple-blue palette.");
}

void DesktopIntegrationContractTest::mainWindowOpensProComparisonFromUpgradeEntrypoints()
{
    const QString source = readTextFile(QStringLiteral(SOURCE_ROOT "/qml/Main.qml"));

    QVERIFY2(source.contains(QStringLiteral("property bool proComparisonOpen")), "Main window must track the comparison popup state.");
    QVERIFY2(source.contains(QStringLiteral("PlanComparisonDialog")), "Main window must instantiate the reusable plan comparison dialog.");
    QVERIFY2(source.contains(QStringLiteral("proComparisonOpen = true")), "Main window must open the plan comparison from entrypoints.");
    QVERIFY2(source.contains(QStringLiteral("onClicked: root.proComparisonOpen = true")), "Pro badge must open the comparison.");
    QVERIFY2(source.contains(QStringLiteral("升级 Pro")), "Settings must expose an upgrade entrypoint.");
    QVERIFY2(source.contains(QStringLiteral("Pro 功能")), "Settings must expose locked Pro feature entrypoints.");
}

QTEST_MAIN(DesktopIntegrationContractTest)
#include "tst_desktop_integration_contract.moc"
