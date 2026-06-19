import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Popup {
    id: root
    modal: true
    focus: true
    padding: 0
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    property bool proEnabled: false
    property int cardRadius: 26
    signal upgradeRequested()

    width: Math.min(980, parent ? parent.width - 64 : 980)
    height: Math.min(700, parent ? parent.height - 64 : 700)
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - height) / 2) : 0

    background: Rectangle {
        radius: root.cardRadius + 4
        color: "#ffffff"
        border.color: "#e8e7f6"
        border.width: 1
    }

    contentItem: Rectangle {
        radius: root.cardRadius + 4
        color: "#ffffff"
        clip: true

        Rectangle {
            id: topGlow
            width: 300
            height: 300
            radius: 150
            x: 18
            y: 14
            color: "#eef4ff"
            opacity: 0.9
        }

        Rectangle {
            id: bottomGlow
            width: 260
            height: 260
            radius: 130
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            anchors.rightMargin: 18
            anchors.bottomMargin: 12
            color: "#f7ead1"
            opacity: 0.46
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: root.width < 760 ? 18 : 26
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 5

                    Text {
                        Layout.fillWidth: true
                        text: "选择适合你的 Cliply"
                        color: "#111827"
                        font.pixelSize: root.width < 760 ? 24 : 30
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    Text {
                        Layout.fillWidth: true
                        text: "普通版适合轻量记录，Pro 解锁专业剪贴板工作台能力。"
                        color: "#746b92"
                        font.pixelSize: 14
                        elide: Text.ElideRight
                    }
                }

                Button {
                    text: "关闭"
                    onClicked: root.close()
                    background: Rectangle {
                        radius: 15
                        color: "#f8fafc"
                        border.color: "#e5e7eb"
                    }
                }
            }

            ScrollView {
                id: planScroll
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                contentWidth: availableWidth

                GridLayout {
                    width: planScroll.availableWidth
                    columns: root.width < 760 ? 1 : 2
                    columnSpacing: 16
                    rowSpacing: 14

                    PlanCard {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 460
                        planName: "普通版"
                        badgeText: "Free"
                        description: "轻量剪贴板历史工具"
                        highlighted: false
                        features: [
                            "历史记录：100 条",
                            "剪贴板监听、搜索、分类",
                            "收藏、置顶、全局快捷键",
                            "基础图片与文件路径记录",
                            "敏感内容保护：不支持",
                            "OCR 图片文字识别：不支持"
                        ]
                    }

                    PlanCard {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 460
                        planName: "Pro"
                        badgeText: root.proEnabled ? "已激活" : "推荐"
                        description: "专业剪贴板工作台"
                        highlighted: true
                        features: [
                            "历史记录：2000 条",
                            "敏感内容保护：支持",
                            "OCR 图片文字识别：支持",
                            "智能处理：JSON/表格/链接/文本处理",
                            "自动规则：支持",
                            "来源筛选：按 App / 类型 / 时间高级筛选"
                        ]
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text {
                    Layout.fillWidth: true
                    text: root.proEnabled ? "当前已激活 Pro，所有高级能力入口已解锁。" : "Pro 支付暂未接入时，可先展示能力说明与升级入口。"
                    color: "#746b92"
                    font.pixelSize: 13
                    elide: Text.ElideRight
                }

                Button {
                    text: root.proEnabled ? "已激活 Pro" : "升级 Pro"
                    enabled: !root.proEnabled
                    onClicked: root.upgradeRequested()
                    background: Rectangle {
                        radius: 18
                        gradient: Gradient {
                            orientation: Gradient.Horizontal
                            GradientStop { position: 0; color: root.proEnabled ? "#cbd5e1" : "#d8b76a" }
                            GradientStop { position: 1; color: root.proEnabled ? "#94a3b8" : "#8f6b2d" }
                        }
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "white"
                        font.bold: true
                        font.pixelSize: 15
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }

    component PlanCard: Rectangle {
        property string planName: ""
        property string badgeText: ""
        property string description: ""
        property bool highlighted: false
        property var features: []

        radius: root.cardRadius
        clip: true
        color: highlighted ? "#11100d" : "#fbfaf2"
        border.color: highlighted ? "#d8b76a" : "#e6e2d4"
        border.width: highlighted ? 2 : 1

        Rectangle {
            anchors.fill: parent
            radius: parent.radius
            visible: highlighted
            gradient: Gradient {
                GradientStop { position: 0; color: "#11100d" }
                GradientStop { position: 0.58; color: "#211a10" }
                GradientStop { position: 1; color: "#3a2a12" }
            }
        }

        Rectangle {
            visible: highlighted
            width: parent.width * 0.72
            height: parent.width * 0.72
            radius: width / 2
            x: parent.width * 0.45
            y: -height * 0.42
            color: "#33d8b76a"
        }

        Rectangle {
            id: cardShimmer
            visible: highlighted
            width: parent.width * 0.34
            height: parent.height * 1.7
            x: -width
            y: -parent.height * 0.25
            rotation: 22
            opacity: 0.34
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0; color: "#00d8b76a" }
                GradientStop { position: 0.5; color: "#ccf7df9b" }
                GradientStop { position: 1; color: "#00d8b76a" }
            }

            SequentialAnimation on x {
                loops: Animation.Infinite
                NumberAnimation {
                    from: -cardShimmer.width
                    to: cardShimmer.parent.width + cardShimmer.width
                    duration: 1900
                    easing.type: Easing.InOutCubic
                }
                PauseAnimation { duration: 700 }
            }
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        Layout.fillWidth: true
                        text: planName
                        color: highlighted ? "white" : "#111827"
                        font.pixelSize: 25
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    Text {
                        Layout.fillWidth: true
                        text: description
                        color: highlighted ? "#e7d5a3" : "#746b92"
                        font.pixelSize: 14
                        elide: Text.ElideRight
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 70
                    Layout.preferredHeight: 30
                    radius: 15
                    color: highlighted ? "#26ffffff" : "#eef2ff"
                    border.color: highlighted ? "#55d8b76a" : "#c7d2fe"

                    Text {
                        anchors.centerIn: parent
                        text: badgeText
                        color: highlighted ? "#f7df9b" : "#5b63ff"
                        font.pixelSize: 13
                        font.bold: true
                    }
                }
            }

            Repeater {
                model: features

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 42
                    radius: 16
                    color: highlighted ? "#18ffffff" : "#f8fafc"
                    border.color: highlighted ? "#33d8b76a" : "#eef0f6"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 14
                        anchors.rightMargin: 14
                        spacing: 10

                        Text {
                            text: highlighted ? "✓" : "•"
                            color: highlighted ? "#f7df9b" : "#6d5dfc"
                            font.pixelSize: 16
                            font.bold: true
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData
                            color: highlighted ? "#fffaf0" : "#4b5563"
                            font.pixelSize: 13
                            elide: Text.ElideRight
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }
        }
    }
}
