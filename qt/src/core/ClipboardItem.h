#pragma once

#include <QDateTime>
#include <QImage>
#include <QString>

struct ClipboardItem {
    QString id;
    QString preview;
    QString value;
    QString type;
    QImage image;
    QString thumbnail;
    bool favorite = false;
    bool pinned = false;
    QDateTime updatedAt;
};
