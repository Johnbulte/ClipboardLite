import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Cliply

ApplicationWindow {
    id: root
    objectName: "mainWindow"
    width: 1360
    height: 860
    minimumWidth: 820
    minimumHeight: 640
    visible: false
    title: "轻剪 Cliply"
    color: "#f5f7ff"

    property int selectedRow: historyFilterModel.rowCount() > 0 ? Math.min(_selectedRow, historyFilterModel.rowCount() - 1) : -1
    property int _selectedRow: 0
    property var selectedItem: selectedRow >= 0 ? historyFilterModel.get(selectedRow) : ({})
    property int totalCount: historyModel.rowCount()
    property int favoriteTotal: historyModel.favoriteCount()
    property int textTotal: historyModel.typeCount("text")
    property int linkTotal: historyModel.typeCount("link")
    property int codeTotal: historyModel.typeCount("code")
    property int emailTotal: historyModel.typeCount("email")
    property int colorTotal: historyModel.typeCount("color")
    property int tableTotal: historyModel.typeCount("table")
    property string selectedCategory: "all"
    property string searchText: ""
    property bool settingsOpen: false
    property bool compactLayout: width < 1180
    property bool veryCompactLayout: width < 930
    property string copyToastMessage: ""
    property bool launchAtStartup: settingsController.launchAtStartup
    property bool clipboardListening: settingsController.clipboardListening
    property string globalShortcut: "Ctrl+Shift+V"
    property bool shortcutRecording: false
    property bool proEnabled: historyModel.proEnabled
    property bool proComparisonOpen: false

    function isModifierOnlyKey(key) {
        return key === Qt.Key_Control
            || key === Qt.Key_Shift
            || key === Qt.Key_Alt
            || key === Qt.Key_Meta
    }

    function keyNameFromCode(key) {
        if (key >= Qt.Key_A && key <= Qt.Key_Z) {
            return String.fromCharCode("A".charCodeAt(0) + key - Qt.Key_A)
        }
        if (key >= Qt.Key_0 && key <= Qt.Key_9) {
            return String.fromCharCode("0".charCodeAt(0) + key - Qt.Key_0)
        }
        if (key >= Qt.Key_F1 && key <= Qt.Key_F12) {
            return "F" + (key - Qt.Key_F1 + 1)
        }

        const keyMap = {
            [Qt.Key_Space]: "Space",
            [Qt.Key_Tab]: "Tab",
            [Qt.Key_Return]: "Enter",
            [Qt.Key_Enter]: "Enter",
            [Qt.Key_Escape]: "Esc",
            [Qt.Key_Backspace]: "Backspace",
            [Qt.Key_Delete]: "Delete",
            [Qt.Key_Insert]: "Insert",
            [Qt.Key_Home]: "Home",
            [Qt.Key_End]: "End",
            [Qt.Key_PageUp]: "PageUp",
            [Qt.Key_PageDown]: "PageDown",
            [Qt.Key_Left]: "Left",
            [Qt.Key_Right]: "Right",
            [Qt.Key_Up]: "Up",
            [Qt.Key_Down]: "Down",
            [Qt.Key_Minus]: "-",
            [Qt.Key_Equal]: "=",
            [Qt.Key_BracketLeft]: "[",
            [Qt.Key_BracketRight]: "]",
            [Qt.Key_Backslash]: "\\",
            [Qt.Key_Semicolon]: ";",
            [Qt.Key_Apostrophe]: "'",
            [Qt.Key_Comma]: ",",
            [Qt.Key_Period]: ".",
            [Qt.Key_Slash]: "/"
        }
        return keyMap[key] || ""
    }

    function formatShortcut(event) {
        let parts = []
        if (event.modifiers & Qt.ControlModifier) parts.push("Ctrl")
        if (event.modifiers & Qt.AltModifier) parts.push("Alt")
        if (event.modifiers & Qt.ShiftModifier) parts.push("Shift")
        if (event.modifiers & Qt.MetaModifier) parts.push("Win")

        const keyName = keyNameFromCode(event.key)
        if (keyName.length === 0) {
            return ""
        }
        parts.push(keyName)
        return parts.join("+")
    }

    function showCopyToast(message) {
        copyToastMessage = message
        copyToastFade.stop()
        copyToast.opacity = 1
        copyPopup.open()
        copyToastTimer.restart()
    }

    function refreshCounts() {
        var counts = historyModel.categoryCounts()
        totalCount = counts.total
        favoriteTotal = counts.favorite
        textTotal = counts.text
        linkTotal = counts.link
        codeTotal = counts.code
        emailTotal = counts.email
        colorTotal = counts.color
        tableTotal = counts.table
    }

    function selectRow(row) {
        _selectedRow = row
        selectedItem = row >= 0 ? historyFilterModel.get(row) : ({})
        refreshCounts()
    }

    Connections {
        target: historyModel
        function onRowsRemoved() {
            root.refreshCounts()
            root.selectRow(historyModel.rowCount() > 0 ? Math.min(root._selectedRow, historyModel.rowCount() - 1) : -1)
        }
        function onRowsInserted() {
            root.refreshCounts()
            root.selectRow(0)
        }
        function onDataChanged() {
            root.selectedItem = root.selectedRow >= 0 ? historyFilterModel.get(root.selectedRow) : ({})
            root.refreshCounts()
        }
    }

    Connections {
        target: historyFilterModel
        function onRowsRemoved() {
            root.selectRow(historyFilterModel.rowCount() > 0 ? Math.min(root._selectedRow, historyFilterModel.rowCount() - 1) : -1)
        }
        function onRowsInserted() {
            root.selectRow(0)
        }
        function onModelReset() {
            root.selectRow(historyFilterModel.rowCount() > 0 ? 0 : -1)
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#f5f7ff"

        Rectangle {
            width: 310
            height: 310
            radius: 155
            x: -110
            y: 120
            color: "#bfdbfe"
            opacity: 0.72
        }

        Rectangle {
            width: 270
            height: 270
            radius: 135
            x: parent.width - 190
            y: parent.height - 170
            color: "#f9a8d4"
            opacity: 0.34
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: root.compactLayout ? 16 : 22
        spacing: root.compactLayout ? 10 : 14

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: root.compactLayout ? 92 : 106
            spacing: root.compactLayout ? 12 : 18

            Rectangle {
                width: root.compactLayout ? 62 : 78
                height: root.compactLayout ? 62 : 78
                radius: root.compactLayout ? 18 : 22
                Layout.alignment: Qt.AlignVCenter
                gradient: Gradient {
                    GradientStop { position: 0; color: "#ffb02e" }
                    GradientStop { position: 0.62; color: "#ff6b1f" }
                    GradientStop { position: 1; color: "#ff426f" }
                }

                Text {
                    anchors.centerIn: parent
                    text: "C"
                    color: "white"
                    font.pixelSize: root.compactLayout ? 34 : 44
                    font.bold: true
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignVCenter
                spacing: 2

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Text {
                        text: "轻量剪贴板工具"
                        color: "#6d5dfc"
                        font.pixelSize: 17
                        font.bold: true
                        font.letterSpacing: 1.2
                    }
                    Rectangle {
                        width: 74
                        height: 5
                        radius: 3
                        gradient: Gradient {
                            orientation: Gradient.Horizontal
                            GradientStop { position: 0; color: "#6d5dfc" }
                            GradientStop { position: 1; color: "#4aa3ff" }
                        }
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: "轻剪 Cliply"
                    color: "#101828"
                    font.pixelSize: root.compactLayout ? 30 : 40
                    font.bold: true
                    elide: Text.ElideRight
                }

                Text {
                    Layout.fillWidth: true
                    text: "正在监听剪贴板，复制后自动保存到历史"
                    color: "#7c7398"
                    font.pixelSize: 16
                    elide: Text.ElideRight
                }
            }

            RowLayout {
                Layout.alignment: Qt.AlignVCenter
                spacing: 10
                visible: !root.compactLayout

                Button {
                    id: proBadgeButton
                    text: root.proEnabled ? "Pro 已激活" : "升级 Pro"
                    onClicked: root.proComparisonOpen = true
                    background: Rectangle {
                        id: proBadgeBackground
                        radius: 18
                        color: "#ff8a1f"
                        clip: true

                        Rectangle {
                            width: parent.width * 0.52
                            height: parent.height * 2.2
                            x: -width
                            y: -parent.height * 0.6
                            rotation: 24
                            opacity: 0.52
                            gradient: Gradient {
                                orientation: Gradient.Horizontal
                                GradientStop { position: 0; color: "#00ffffff" }
                                GradientStop { position: 0.5; color: "#ccffffff" }
                                GradientStop { position: 1; color: "#00ffffff" }
                            }

                            SequentialAnimation on x {
                                loops: Animation.Infinite
                                NumberAnimation {
                                    from: -proBadgeBackground.width * 0.65
                                    to: proBadgeBackground.width * 1.15
                                    duration: 1450
                                    easing.type: Easing.InOutCubic
                                }
                                PauseAnimation { duration: 500 }
                            }
                        }

                        Rectangle {
                            anchors.fill: parent
                            radius: parent.radius
                            color: "transparent"
                            border.color: "#ffd7a8"
                            border.width: 1
                            opacity: 0.85
                        }
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "white"
                        font.pixelSize: 15
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    text: "设置"
                    onClicked: root.settingsOpen = true
                    background: Rectangle {
                        radius: 18
                        color: "#ffffff"
                        border.color: "#e5e7eb"
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#51476d"
                        font.pixelSize: 15
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 42
            spacing: 8
            visible: root.compactLayout

            Item { Layout.fillWidth: true }

            Button {
                id: compactProBadgeButton
                text: root.proEnabled ? "Pro" : "升级 Pro"
                onClicked: root.proComparisonOpen = true
                background: Rectangle {
                    id: compactProBadgeBackground
                    radius: 18
                    color: "#ff8a1f"
                    clip: true

                    Rectangle {
                        width: parent.width * 0.6
                        height: parent.height * 2.2
                        x: -width
                        y: -parent.height * 0.6
                        rotation: 24
                        opacity: 0.5
                        gradient: Gradient {
                            orientation: Gradient.Horizontal
                            GradientStop { position: 0; color: "#00ffffff" }
                            GradientStop { position: 0.5; color: "#ccffffff" }
                            GradientStop { position: 1; color: "#00ffffff" }
                        }

                        SequentialAnimation on x {
                            loops: Animation.Infinite
                            NumberAnimation {
                                from: -compactProBadgeBackground.width * 0.7
                                to: compactProBadgeBackground.width * 1.15
                                duration: 1450
                                easing.type: Easing.InOutCubic
                            }
                            PauseAnimation { duration: 500 }
                        }
                    }
                }
                contentItem: Text {
                    text: parent.text
                    color: "white"
                    font.pixelSize: 14
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                text: "设置"
                onClicked: root.settingsOpen = true
                background: Rectangle {
                    radius: 18
                    color: "#ffffff"
                    border.color: "#e5e7eb"
                }
                contentItem: Text {
                    text: parent.text
                    color: "#51476d"
                    font.pixelSize: 14
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

        }

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 78
            spacing: 14
            visible: root.height >= 780

            FeatureCard {
                Layout.fillWidth: true
                title: "自动收集"
                description: "复制文本后自动保存到本地历史"
                iconText: "📋"
            }
            FeatureCard {
                Layout.fillWidth: true
                highlighted: true
                title: "自动分类"
                description: "识别文本、图片、文件、链接、代码、邮箱和颜色"
                iconText: "🏷"
            }
            FeatureCard {
                Layout.fillWidth: true
                title: "一键复用"
                description: "搜索、收藏、复制，减少重复操作"
                iconText: "⚡"
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumHeight: 420
            spacing: root.compactLayout ? 12 : 18

            CategorySidebar {
                Layout.preferredWidth: root.veryCompactLayout ? 0 : 245
                Layout.minimumWidth: root.veryCompactLayout ? 0 : 210
                Layout.maximumWidth: 280
                Layout.fillHeight: true
                visible: !root.veryCompactLayout
                totalCount: root.totalCount
                favoriteCount: root.favoriteTotal
                textCount: root.textTotal
                linkCount: root.linkTotal
                codeCount: root.codeTotal
                emailCount: root.emailTotal
                colorCount: root.colorTotal
                tableCount: root.tableTotal
                selectedCategory: root.selectedCategory
                onCategorySelected: function(category) {
                    root.selectedCategory = category
                    historyFilterModel.category = category
                    root.selectRow(historyFilterModel.rowCount() > 0 ? 0 : -1)
                }
            }

            HistoryList {
                Layout.fillWidth: true
                Layout.minimumWidth: 0
                Layout.fillHeight: true
                model: historyFilterModel
                selectedRow: root.selectedRow
                totalCount: historyFilterModel.rowCount()
                favoriteCount: root.favoriteTotal
                searchText: root.searchText
                onActivated: function(row) {
                    root.selectRow(row)
                }
                onSearchTextChangedByUser: function(text) {
                    root.searchText = text
                    historyFilterModel.searchText = text
                    root.selectRow(historyFilterModel.rowCount() > 0 ? 0 : -1)
                }
                onCopyLatestClicked: {
                    if (historyFilterModel.rowCount() > 0) {
                        const copied = historyFilterModel.copyItem(0)
                        root.selectRow(0)
                        root.showCopyToast(copied ? "已复制最新内容" : "复制失败")
                    } else {
                        root.showCopyToast("没有可复制的内容")
                    }
                }
                onPinRequested: function(row) {
                    historyFilterModel.togglePin(row)
                    root.selectRow(historyFilterModel.rowCount() > 0 ? 0 : -1)
                    root.refreshCounts()
                }
                onFavoriteRequested: function(row) {
                    historyFilterModel.toggleFavorite(row)
                    root.selectRow(row)
                    root.refreshCounts()
                }
                onDeleteRequested: function(row) {
                    historyFilterModel.removeItem(row)
                    root.selectRow(historyFilterModel.rowCount() > 0 ? Math.min(row, historyFilterModel.rowCount() - 1) : -1)
                    root.refreshCounts()
                }
            }

            DetailPanel {
                Layout.preferredWidth: root.compactLayout ? 0 : 420
                Layout.minimumWidth: root.compactLayout ? 0 : 360
                Layout.maximumWidth: root.compactLayout ? 0 : 520
                Layout.fillHeight: true
                visible: !root.compactLayout
                item: root.selectedItem
                hasItem: root.selectedRow >= 0
                onFavoriteClicked: {
                    if (root.selectedRow >= 0) {
                        historyFilterModel.toggleFavorite(root.selectedRow)
                    }
                }
                onCopyClicked: {
                    if (root.selectedRow >= 0) {
                        const copied = historyFilterModel.copyItem(root.selectedRow)
                        root.showCopyToast(copied ? "已复制到剪贴板" : "复制失败")
                    } else {
                        root.showCopyToast("没有可复制的内容")
                    }
                }
                onDeleteClicked: {
                    if (root.selectedRow >= 0) {
                        historyFilterModel.removeItem(root.selectedRow)
                    }
                }
            }
        }
    }

    Timer {
        id: copyToastTimer
        interval: 1500
        repeat: false
        onTriggered: copyToastFade.start()
    }

    NumberAnimation {
        id: copyToastFade
        target: copyToast
        property: "opacity"
        to: 0
        duration: 260
        easing.type: Easing.OutCubic
    }

    Popup {
        id: copyPopup
        modal: false
        focus: false
        closePolicy: Popup.NoAutoClose
        x: Math.round((root.width - width) / 2)
        y: root.height - height - 34
        padding: 0
        background: null
        contentItem: Item {
            implicitWidth: copyToast.width
            implicitHeight: copyToast.height
        }
    }

    Rectangle {
        id: copyToast
        parent: copyPopup.contentItem
        z: 30
        opacity: 0
        visible: opacity > 0
        width: Math.min(copyToastText.implicitWidth + 42, root.width - 64)
        height: 44
        radius: 22
        color: "#25263acc"
        border.color: "#ffffff55"
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 34

        Text {
            id: copyToastText
            anchors.centerIn: parent
            width: parent.width - 30
            text: root.copyToastMessage
            color: "#ffffff"
            font.pixelSize: 14
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
        }
    }

    Rectangle {
        anchors.fill: parent
        visible: root.settingsOpen
        z: 20
        color: "#26304755"

        MouseArea {
            anchors.fill: parent
            onClicked: root.settingsOpen = false
        }

        Rectangle {
            width: Math.min(680, parent.width - 80)
            height: Math.min(590, parent.height - 80)
            anchors.centerIn: parent
            radius: 28
            color: "#ffffff"
            border.color: "#e6e8f2"
            clip: true

            MouseArea {
                anchors.fill: parent
                onClicked: function(mouse) {
                    mouse.accepted = true
                }
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 18

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                    Text {
                        Layout.fillWidth: true
                        text: "偏好设置"
                            color: "#111827"
                            font.pixelSize: 24
                            font.bold: true
                            elide: Text.ElideRight
                        }
                    }

                    Button {
                        text: "关闭"
                        onClicked: root.settingsOpen = false
                        background: Rectangle {
                            radius: 14
                            color: "#f8fafc"
                            border.color: "#e5e7eb"
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 72
                    radius: 20
                    color: "#f8fafc"
                    border.color: "#edf0f7"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14
                        ColumnLayout {
                            Layout.fillWidth: true
                            Text { text: "剪贴板监听"; color: "#1f2937"; font.pixelSize: 16; font.bold: true }
                            Text { Layout.fillWidth: true; text: "开启后复制内容会自动进入本地历史。"; color: "#7c7398"; font.pixelSize: 13; elide: Text.ElideRight }
                        }
                        Text { text: root.clipboardListening ? "监听开启" : "监听关闭"; color: "#6d5dfc"; font.pixelSize: 13; font.bold: true }
                        Switch {
                            checked: root.clipboardListening
                            onToggled: settingsController.clipboardListening = checked
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 72
                    radius: 20
                    color: "#f8fafc"
                    border.color: "#edf0f7"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14
                        ColumnLayout {
                            Layout.fillWidth: true
                            Text { text: "开机启动"; color: "#1f2937"; font.pixelSize: 16; font.bold: true }
                            Text { Layout.fillWidth: true; text: "登录系统后自动在后台运行 Cliply。"; color: "#7c7398"; font.pixelSize: 13; elide: Text.ElideRight }
                        }
                        Switch {
                            checked: root.launchAtStartup
                            onToggled: settingsController.launchAtStartup = checked
                        }
                    }
                }

                Rectangle {
                    id: shortcutSettingCard
                    Layout.fillWidth: true
                    implicitHeight: 72
                    radius: 20
                    color: "#f8fafc"
                    border.color: "#edf0f7"

                    TextInput {
                        id: shortcutRecorder
                        anchors.fill: parent
                        opacity: 0
                        focus: root.shortcutRecording
                        activeFocusOnPress: false

                        Keys.onPressed: function(event) {
                            if (!root.shortcutRecording) {
                                return
                            }
                            if (event.key === Qt.Key_Escape) {
                                root.shortcutRecording = false
                                event.accepted = true
                                return
                            }
                            if (isModifierOnlyKey(event.key)) {
                                event.accepted = true
                                return
                            }
                            const shortcut = formatShortcut(event)
                            if (shortcut.length === 0) {
                                event.accepted = true
                                return
                            }
                            const oldShortcut = root.globalShortcut
                            if (shortcutController.setShortcut(shortcut)) {
                                root.globalShortcut = shortcut
                            } else {
                                root.globalShortcut = oldShortcut
                                root.showCopyToast("快捷键注册失败，请换一个组合")
                            }
                            root.shortcutRecording = false
                            event.accepted = true
                        }
                    }

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14
                        ColumnLayout {
                            Layout.fillWidth: true
                            Text { text: "快捷键"; color: "#1f2937"; font.pixelSize: 16; font.bold: true }
                            Text { Layout.fillWidth: true; text: "用于呼出快捷剪贴板窗口。"; color: "#7c7398"; font.pixelSize: 13; elide: Text.ElideRight }
                        }
                        Rectangle {
                            Layout.preferredWidth: 112
                            Layout.preferredHeight: 34
                            radius: 17
                            color: root.shortcutRecording ? "#fff7ed" : "#eeeaff"
                            border.color: root.shortcutRecording ? "#fdba74" : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: root.globalShortcut
                                color: "#6657df"
                                font.pixelSize: 13
                                font.bold: true
                            }
                        }
                        Button {
                            text: root.shortcutRecording ? "请按快捷键" : "自定义快捷键"
                            onClicked: {
                                root.shortcutRecording = true
                                shortcutRecorder.forceActiveFocus()
                            }
                            background: Rectangle { radius: 16; color: "#ffffff"; border.color: "#dcdcf5" }
                            contentItem: Text {
                                text: parent.text
                                color: "#51476d"
                                font.pixelSize: 13
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 92
                    radius: 20
                    color: "#f8fafc"
                    border.color: "#edf0f7"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14
                        ColumnLayout {
                            Layout.fillWidth: true
                            Text { text: "保留历史记录"; color: "#1f2937"; font.pixelSize: 16; font.bold: true }
                            Text {
                                Layout.fillWidth: true
                                text: root.proEnabled ? "Pro 最多保留 2000 条历史记录。" : "普通版最多保留 100 条，升级 Pro 可保留 2000 条。"
                                color: "#7c7398"
                                font.pixelSize: 13
                                elide: Text.ElideRight
                            }
                        }
                        ComboBox {
                            id: historyLimitCombo
                            Layout.preferredWidth: 150
                            textRole: "label"
                            valueRole: "value"
                            model: [
                                { label: "20 条", value: 20 },
                                { label: "50 条", value: 50 },
                                { label: "100 条", value: 100 },
                                { label: "200 条", value: 200 },
                                { label: "500 条", value: 500 },
                                { label: "1000 条", value: 1000 },
                                { label: "2000 条", value: 2000 }
                            ].filter(function(option) { return root.proEnabled || option.value <= 100 })
                            Component.onCompleted: currentIndex = Math.max(0, indexOfValue(historyModel.maxItems))
                            onActivated: historyModel.maxItems = currentValue
                            Connections {
                                target: historyModel
                                function onMaxItemsChanged() {
                                    historyLimitCombo.currentIndex = Math.max(0, historyLimitCombo.indexOfValue(historyModel.maxItems))
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 122
                    radius: 20
                    color: "#fff7ed"
                    border.color: "#fed7aa"
                    clip: true

                    Rectangle {
                        width: parent.width * 0.28
                        height: parent.height * 1.8
                        x: -width
                        y: -parent.height * 0.35
                        rotation: 24
                        opacity: 0.34
                        gradient: Gradient {
                            orientation: Gradient.Horizontal
                            GradientStop { position: 0; color: "#00ffffff" }
                            GradientStop { position: 0.5; color: "#ccffffff" }
                            GradientStop { position: 1; color: "#00ffffff" }
                        }

                        SequentialAnimation on x {
                            loops: Animation.Infinite
                            NumberAnimation {
                                from: -parent.width * 0.3
                                to: parent.width * 1.1
                                duration: 1700
                                easing.type: Easing.InOutCubic
                            }
                            PauseAnimation { duration: 700 }
                        }
                    }

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 5
                            Text { text: "Pro 功能"; color: "#9a3412"; font.pixelSize: 16; font.bold: true }
                            Text {
                                Layout.fillWidth: true
                                text: root.proEnabled ? "敏感保护、OCR、智能处理、自动规则和高级来源筛选已解锁。" : "解锁敏感保护、OCR 图片文字识别、智能处理、自动规则和高级来源筛选。"
                                color: "#7c2d12"
                                font.pixelSize: 13
                                wrapMode: Text.WordWrap
                            }
                        }

                        Rectangle {
                            Layout.preferredWidth: 76
                            Layout.preferredHeight: 32
                            radius: 16
                            color: root.proEnabled ? "#dcfce7" : "#ffffffaa"
                            border.color: root.proEnabled ? "#86efac" : "#fdba74"
                            Text {
                                anchors.centerIn: parent
                                text: root.proEnabled ? "已解锁" : "已锁定"
                                color: root.proEnabled ? "#15803d" : "#c2410c"
                                font.pixelSize: 13
                                font.bold: true
                            }
                        }

                        Button {
                            text: root.proEnabled ? "查看权益" : "升级 Pro"
                            onClicked: root.proComparisonOpen = true
                            background: Rectangle {
                                radius: 16
                                color: "#ff8a1f"
                            }
                            contentItem: Text {
                                text: parent.text
                                color: "white"
                                font.pixelSize: 13
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 72
                    radius: 20
                    color: "#f8fafc"
                    border.color: "#edf0f7"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 14
                        ColumnLayout {
                            Layout.fillWidth: true
                            Text { text: "历史记录"; color: "#1f2937"; font.pixelSize: 16; font.bold: true }
                            Text { Layout.fillWidth: true; text: "本地保存 · 共 " + root.totalCount + " 条，当前筛选显示 " + historyFilterModel.rowCount() + " 条。"; color: "#7c7398"; font.pixelSize: 13; elide: Text.ElideRight }
                        }
                        Text { text: "本地保存"; color: "#16a34a"; font.pixelSize: 13; font.bold: true }
                        Button {
                            text: "清空历史"
                            onClicked: {
                                historyModel.clear()
                                root.settingsOpen = false
                            }
                            background: Rectangle { radius: 14; color: "#ff525c" }
                            contentItem: Text {
                                text: parent.text
                                color: "white"
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }
                }

                Item { Layout.fillHeight: true }
            }
        }
    }

    PlanComparisonDialog {
        id: planComparisonDialog
        parent: Overlay.overlay
        proEnabled: root.proEnabled
        visible: root.proComparisonOpen
        onClosed: root.proComparisonOpen = false
        onUpgradeRequested: {
            // Activate Pro (demo mode - no payment gateway integrated yet)
            settingsController.proEnabled = true
            root.showCopyToast("Pro 已激活，高级功能已解锁")
            root.proComparisonOpen = false
        }
    }

    component FeatureCard: Rectangle {
        property string title: ""
        property string description: ""
        property string iconText: ""
        property bool highlighted: false

        radius: 26
        color: highlighted ? "#eef2ff" : "#ffffff"
        border.color: highlighted ? "#c7d2fe" : "#e7eaf3"
        border.width: 1
        clip: true

        RowLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 12

            Text {
                text: iconText
                font.pixelSize: 28
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 5
                Text {
                    Layout.fillWidth: true
                    text: title
                    color: "#1f2937"
                    font.pixelSize: 16
                    font.bold: true
                    elide: Text.ElideRight
                }
                Text {
                    Layout.fillWidth: true
                    text: description
                    color: "#7c7398"
                    font.pixelSize: 12
                    elide: Text.ElideRight
                }
            }
        }
    }
}
