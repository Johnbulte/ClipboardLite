import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Cliply

ApplicationWindow {
    id: root
    objectName: "quickPanelWindow"
    width: 430
    height: 560
    minimumWidth: 380
    minimumHeight: 420
    visible: false
    flags: Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
    title: "Cliply Ctrl+Shift+V"
    color: "#f8f5ff"

    property int selectedRow: historyFilterModel.rowCount() > 0 ? Math.min(_selectedRow, historyFilterModel.rowCount() - 1) : -1
    property int _selectedRow: 0
    property string searchText: ""

    signal pasteRequested()

    function selectRow(row) {
        _selectedRow = historyFilterModel.rowCount() > 0 ? Math.max(0, Math.min(row, historyFilterModel.rowCount() - 1)) : -1
    }

    function pasteSelected() {
        if (selectedRow >= 0) {
            if (historyFilterModel.pasteItem(selectedRow)) {
                root.pasteRequested()
            }
            root.hide()
        }
    }

    onVisibleChanged: {
        if (visible) {
            searchField.text = ""
            searchText = ""
            historyFilterModel.searchText = ""
            selectRow(historyFilterModel.rowCount() > 0 ? 0 : -1)
            searchField.forceActiveFocus()
        }
    }

    onActiveChanged: {
        if (!active && visible) {
            hide()
        }
    }

    Shortcut {
        sequence: "Escape"
        onActivated: root.hide()
    }

    Shortcut {
        sequence: "Return"
        onActivated: root.pasteSelected()
    }

    Rectangle {
        anchors.fill: parent
        radius: 22
        color: "#f8f5ff"
        border.color: "#e6e0ff"

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 10

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Text {
                        Layout.fillWidth: true
                        text: "Cliply 剪贴板历史"
                        color: "#111827"
                        font.pixelSize: 18
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    Text {
                        Layout.fillWidth: true
                        text: "Ctrl+Shift+V 调出，Enter 粘贴选中项，Esc 关闭"
                        color: "#7c7398"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }

                Button {
                    text: "×"
                    implicitWidth: 34
                    implicitHeight: 34
                    onClicked: root.hide()
                }
            }

            TextField {
                id: searchField
                Layout.fillWidth: true
                placeholderText: "搜索剪贴板历史..."
                selectByMouse: true
                leftPadding: 12
                rightPadding: 12
                topPadding: 8
                bottomPadding: 8
                background: Rectangle {
                    radius: 14
                    color: "#ffffff"
                    border.width: searchField.activeFocus ? 2 : 1
                    border.color: searchField.activeFocus ? "#8b5cf6" : "#e6e0ff"
                }
                onTextChanged: {
                    root.searchText = text
                    historyFilterModel.searchText = text
                    root.selectRow(historyFilterModel.rowCount() > 0 ? 0 : -1)
                }
            }

            ListView {
                id: listView
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                model: historyFilterModel
                currentIndex: root.selectedRow

                Keys.onDownPressed: root.selectRow(root.selectedRow + 1)
                Keys.onUpPressed: root.selectRow(root.selectedRow - 1)

                delegate: Rectangle {
                    required property int index
                    required property string preview
                    required property string type
                    required property string updatedAt
                    required property string thumbnail

                    width: ListView.view.width
                    height: 72
                    radius: 16
                    color: index === root.selectedRow ? "#ede9fe" : "#ffffff"
                    border.color: index === root.selectedRow ? "#8b5cf6" : "#ece8f7"

                    MouseArea {
                        anchors.fill: parent
                        hoverEnabled: true
                        onEntered: root.selectRow(index)
                        onClicked: root.selectRow(index)
                        onDoubleClicked: root.pasteSelected()
                    }

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 10

                        Rectangle {
                            Layout.preferredWidth: 48
                            Layout.preferredHeight: 48
                            radius: 12
                            visible: type === "image" && thumbnail.length > 0
                            color: "#f3f0ff"
                            clip: true
                            border.color: "#e6e0ff"

                            Image {
                                anchors.fill: parent
                                source: thumbnail
                                fillMode: Image.PreserveAspectCrop
                                asynchronous: true
                                cache: true
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                Layout.fillWidth: true
                                text: preview
                                color: "#111827"
                                font.pixelSize: 14
                                elide: Text.ElideRight
                                maximumLineCount: type === "image" && thumbnail.length > 0 ? 2 : 1
                            }

                            Text {
                                Layout.fillWidth: true
                                text: type + " · " + updatedAt
                                color: "#8b849e"
                                font.pixelSize: 11
                                elide: Text.ElideRight
                            }
                        }
                    }
                }

                ScrollBar.vertical: ScrollBar {}
            }

            Text {
                Layout.fillWidth: true
                horizontalAlignment: Text.AlignHCenter
                text: historyFilterModel.rowCount() === 0 ? "暂无剪贴板历史" : "↑/↓ 选择 · Enter 粘贴 · Esc 关闭"
                color: "#7c7398"
                font.pixelSize: 12
            }
        }
    }
}
