import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    radius: 26
    color: "#ffffff"
    border.color: "#ececf6"
    border.width: 1
    clip: true

    property alias model: listView.model
    property int selectedRow: 0
    property int totalCount: 0
    property int favoriteCount: 0
    property string searchText: ""
    signal activated(int row)
    signal copyLatestClicked()
    signal searchTextChangedByUser(string text)
    signal pinRequested(int row)
    signal favoriteRequested(int row)
    signal deleteRequested(int row)

    function typeLabel(type) {
        if (type === "text") return "文本"
        if (type === "link") return "链接"
        if (type === "code") return "代码"
        if (type === "email") return "邮箱"
        if (type === "color") return "颜色"
        if (type === "table") return "表格"
        if (type === "image") return "图片"
        if (type === "file") return "文件"
        return type || "-"
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 18
        spacing: 13

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 46
            spacing: 12

            TextField {
                Layout.fillWidth: true
                Layout.preferredHeight: 46
                text: root.searchText
                placeholderText: "搜索复制过的内容..."
                color: "#1f2937"
                placeholderTextColor: "#9a94ad"
                selectByMouse: true
                leftPadding: 16
                rightPadding: 16
                verticalAlignment: TextInput.AlignVCenter
                background: Rectangle {
                    radius: 18
                    color: "#ffffff"
                    border.color: "#e7e7f2"
                }
                onTextEdited: root.searchTextChangedByUser(text)
            }

            Button {
                Layout.preferredWidth: 108
                Layout.preferredHeight: 46
                text: "复制最新"
                onClicked: root.copyLatestClicked()
                background: Rectangle {
                    radius: 18
                    gradient: Gradient {
                        orientation: Gradient.Horizontal
                        GradientStop { position: 0; color: "#6d5dfc" }
                        GradientStop { position: 1; color: "#4aa3ff" }
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
        }

        Text {
            Layout.fillWidth: true
            text: "共 " + root.totalCount + " 条记录 · " + root.favoriteCount + " 条收藏"
            color: "#7c7398"
            font.pixelSize: 13
            elide: Text.ElideRight
        }

        ListView {
            id: listView
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 10
            clip: true

            delegate: Rectangle {
                id: itemCard
                required property int index
                required property string preview
                required property string type
                required property string updatedAt
                required property string thumbnail
                required property bool favorite
                required property bool pinned

                width: ListView.view.width
                height: 76
                radius: 20
                color: root.selectedRow === index ? "#f0efff" : "#ffffff"
                border.color: root.selectedRow === index ? "#c9c6ff" : "#e9eaf2"
                border.width: 1

                MouseArea {
                    anchors.fill: parent
                    acceptedButtons: Qt.LeftButton | Qt.RightButton
                    onClicked: function(mouse) {
                        root.activated(index)
                        if (mouse.button === Qt.RightButton) {
                            contextPopup.open()
                        }
                    }
                }

                Popup {
                    id: contextPopup
                    width: 190
                    height: 154
                    padding: 0
                    modal: false
                    focus: true
                    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
                    background: Rectangle {
                        radius: 18
                        color: "#ffffff"
                        border.color: "#e6e8f2"
                    }
                    contentItem: Rectangle {
                        radius: 18
                        color: "#ffffff"
                        border.color: "#e6e8f2"
                        layer.enabled: true

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 4

                            ContextAction {
                                Layout.fillWidth: true
                                text: pinned ? "取消置顶" : "置顶"
                                onClicked: {
                                    contextPopup.close()
                                    root.pinRequested(index)
                                }
                            }
                            ContextAction {
                                Layout.fillWidth: true
                                text: favorite ? "取消收藏" : "收藏"
                                onClicked: {
                                    contextPopup.close()
                                    root.favoriteRequested(index)
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 1
                                color: "#edf0f7"
                            }
                            ContextAction {
                                Layout.fillWidth: true
                                text: "删除"
                                danger: true
                                onClicked: {
                                    contextPopup.close()
                                    root.deleteRequested(index)
                                }
                            }
                        }
                    }
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 13
                    spacing: 12

                    Rectangle {
                        width: 76
                        height: 44
                        radius: 15
                        color: thumbnail.length > 0 ? "#111827" : "#eef2ff"
                        visible: type === "image"
                        clip: true

                        Image {
                            anchors.fill: parent
                            source: thumbnail
                            fillMode: Image.PreserveAspectCrop
                            visible: thumbnail.length > 0
                            asynchronous: true
                        }

                        Text {
                            anchors.centerIn: parent
                            visible: thumbnail.length === 0
                            text: "图片"
                            color: "#5b63ff"
                            font.pixelSize: 12
                            font.bold: true
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Text {
                            Layout.fillWidth: true
                            text: preview
                            color: "#111827"
                            font.pixelSize: 15
                            font.bold: true
                            elide: Text.ElideRight
                            maximumLineCount: 1
                        }

                        Text {
                            Layout.fillWidth: true
                            text: root.typeLabel(type) + " · " + updatedAt + (pinned ? " · 已置顶" : "") + (favorite ? " · 已收藏" : "")
                            color: "#8b84a2"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                        }
                    }

                    Rectangle {
                        width: 62
                        height: 30
                        radius: 15
                        color: "#eeeaff"

                        Text {
                            anchors.centerIn: parent
                            width: parent.width - 12
                            text: root.typeLabel(type)
                            color: "#6657df"
                            font.pixelSize: 13
                            horizontalAlignment: Text.AlignHCenter
                            elide: Text.ElideRight
                        }
                    }
                }
            }
        }
    }

    component ContextAction: Rectangle {
        property string text: ""
        property bool danger: false
        signal clicked()

        implicitHeight: 40
        radius: 12
        color: actionMouse.containsMouse ? (danger ? "#fff1f2" : "#f3f4ff") : "#ffffff"

        Text {
            anchors.verticalCenter: parent.verticalCenter
            anchors.left: parent.left
            anchors.leftMargin: 14
            text: parent.text
            color: parent.danger ? "#ff525c" : "#51476d"
            font.pixelSize: 14
            font.bold: parent.danger
        }

        MouseArea {
            id: actionMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: parent.clicked()
        }
    }
}
