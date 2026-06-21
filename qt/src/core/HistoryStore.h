#pragma once

#include "ClipboardItem.h"

#include <QString>
#include <QVector>

class HistoryStore {
public:
    static QString defaultPath();

    bool load(const QString &path, QVector<ClipboardItem> &items);
    bool save(const QString &path, const QVector<ClipboardItem> &items);

private:
    static ClipboardItem fromJson(const class QJsonObject &obj);
    static QJsonObject toJson(const ClipboardItem &item);
};
