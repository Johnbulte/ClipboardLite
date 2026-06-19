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

    property int totalCount: 0
    property int favoriteCount: 0
    property int textCount: 0
    property int linkCount: 0
    property int codeCount: 0
    property int emailCount: 0
    property int colorCount: 0
    property int tableCount: 0
    property string selectedCategory: "all"
    signal categorySelected(string category)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 18
        spacing: 14

        Text {
            Layout.fillWidth: true
            text: "内容筛选"
            color: "#4b3f78"
            font.pixelSize: 14
            font.bold: true
            elide: Text.ElideRight
        }

        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ColumnLayout {
                width: parent.width
                spacing: 8

                Repeater {
                    model: [
                        { label: "全部", value: "all", count: root.totalCount },
                        { label: "收藏", value: "favorite", count: root.favoriteCount },
                        { label: "文本", value: "text", count: root.textCount },
                        { label: "链接", value: "link", count: root.linkCount },
                        { label: "代码", value: "code", count: root.codeCount },
                        { label: "邮箱", value: "email", count: root.emailCount },
                        { label: "颜色", value: "color", count: root.colorCount },
                        { label: "表格", value: "table", count: root.tableCount }
                    ]

                    Rectangle {
                        id: filterItem
                        Layout.fillWidth: true
                        height: 50
                        radius: 16
                        color: root.selectedCategory === modelData.value ? "#5b63ff" : "#f6f8ff"

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.categorySelected(modelData.value)
                        }

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 14
                            anchors.rightMargin: 14
                            spacing: 8

                            Text {
                                Layout.fillWidth: true
                                text: modelData.label
                                color: root.selectedCategory === modelData.value ? "white" : "#5a4d80"
                                font.pixelSize: 15
                                font.bold: root.selectedCategory === modelData.value
                                elide: Text.ElideRight
                            }

                            Text {
                                text: modelData.count
                                color: root.selectedCategory === modelData.value ? "#e9ecff" : "#6d638e"
                                font.pixelSize: 15
                            }
                        }
                    }
                }
            }
        }
    }
}
