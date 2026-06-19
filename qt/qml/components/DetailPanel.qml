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

    property var item: ({})
    property bool hasItem: false
    signal favoriteClicked()
    signal copyClicked()
    signal deleteClicked()

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
        anchors.margins: 20
        spacing: 14

        Text {
            Layout.fillWidth: true
            text: "内容详情"
            color: "#4b3f78"
            font.pixelSize: 14
            font.bold: true
            elide: Text.ElideRight
        }

        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 88
            radius: 22
            color: "#ffffff"
            border.color: "#e9eaf2"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        Rectangle {
                            width: 56
                            height: 30
                            radius: 15
                            color: "#eeeaff"
                            Text {
                                anchors.centerIn: parent
                                width: parent.width - 10
                                text: root.hasItem && item.type ? root.typeLabel(item.type) : "-"
                                color: "#6657df"
                                font.pixelSize: 13
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                elide: Text.ElideRight
                            }
                        }
                        Item { Layout.fillWidth: true }
                        Text {
                            text: root.hasItem && item.updatedAt ? item.updatedAt : ""
                            color: "#8b84a2"
                            font.pixelSize: 13
                        }
                    }

                    Text {
                        Layout.fillWidth: true
                        text: root.hasItem && item.preview ? item.preview : "暂无选中内容"
                        color: "#111827"
                        font.pixelSize: 16
                        font.bold: true
                        elide: Text.ElideRight
                    }
                }
            }
        }

        GridLayout {
            Layout.fillWidth: true
            columns: 2
            columnSpacing: 12
            rowSpacing: 8

            Text { text: "创建时间"; color: "#7c7398"; font.pixelSize: 14 }
            Text {
                Layout.fillWidth: true
                text: root.hasItem ? item.updatedAt : "-"
                color: "#30354a"
                font.pixelSize: 14
                horizontalAlignment: Text.AlignRight
                elide: Text.ElideRight
            }

            Text { text: "内容长度"; color: "#7c7398"; font.pixelSize: 14 }
            Text {
                Layout.fillWidth: true
                text: root.hasItem && item.value ? item.value.length + " 字符" : "-"
                color: "#30354a"
                font.pixelSize: 14
                horizontalAlignment: Text.AlignRight
                elide: Text.ElideRight
            }

            Text { text: "收藏状态"; color: "#7c7398"; font.pixelSize: 14 }
            Text {
                Layout.fillWidth: true
                text: root.hasItem && item.favorite ? "已收藏" : "未收藏"
                color: "#30354a"
                font.pixelSize: 14
                horizontalAlignment: Text.AlignRight
                elide: Text.ElideRight
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            radius: 22
            color: "#ffffff"
            border.color: "#e9eaf2"
            clip: true

            ScrollView {
                anchors.fill: parent
                anchors.margins: 16
                clip: true
                visible: !(root.hasItem && item.type === "image" && item.thumbnail)

                TextArea {
                    text: root.hasItem && item.value ? item.value : ""
                    readOnly: true
                    wrapMode: TextArea.Wrap
                    color: "#1f2937"
                    selectedTextColor: "white"
                    selectionColor: "#6d5dfc"
                    background: null
                    font.pixelSize: 14
                    leftPadding: 0
                    rightPadding: 0
                    topPadding: 0
                    bottomPadding: 0
                    placeholderText: "暂无内容"
                    placeholderTextColor: "#9a94ad"
                }
            }

            Image {
                anchors.fill: parent
                anchors.margins: 16
                source: root.hasItem && item.type === "image" && item.thumbnail ? item.thumbnail : ""
                fillMode: Image.PreserveAspectFit
                visible: root.hasItem && item.type === "image" && item.thumbnail
                asynchronous: true
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Button {
                Layout.fillWidth: true
                text: "复制内容"
                enabled: root.hasItem
                onClicked: root.copyClicked()
                background: Rectangle { radius: 16; color: parent.enabled ? "#5b63ff" : "#d8dce8" }
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
                Layout.preferredWidth: 82
                text: root.hasItem && item.favorite ? "取消" : "收藏"
                enabled: root.hasItem
                onClicked: root.favoriteClicked()
                background: Rectangle { radius: 16; color: "#ffffff"; border.color: "#e3e5ef" }
                contentItem: Text {
                    text: parent.text
                    color: "#5a4d80"
                    font.pixelSize: 15
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                Layout.preferredWidth: 82
                text: "删除"
                enabled: root.hasItem
                onClicked: root.deleteClicked()
                background: Rectangle { radius: 16; color: parent.enabled ? "#ff525c" : "#d8dce8" }
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
    }
}
