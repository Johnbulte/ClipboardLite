#include "core/HistoryStore.h"

#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>

QString HistoryStore::defaultPath()
{
    const QString dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    if (!QDir().mkpath(dir)) {
        return {};
    }
    return dir + QStringLiteral("/history.json");
}

ClipboardItem HistoryStore::fromJson(const QJsonObject &obj)
{
    ClipboardItem item;
    item.id = obj.value(QStringLiteral("id")).toString();
    item.preview = obj.value(QStringLiteral("preview")).toString();
    item.value = obj.value(QStringLiteral("value")).toString();
    item.type = obj.value(QStringLiteral("type")).toString();
    item.thumbnail = obj.value(QStringLiteral("thumbnail")).toString();
    item.favorite = obj.value(QStringLiteral("favorite")).toBool(false);
    item.pinned = obj.value(QStringLiteral("pinned")).toBool(false);
    item.updatedAt = QDateTime::fromString(obj.value(QStringLiteral("updatedAt")).toString(), Qt::ISODate);

    // Image is not persisted as full QImage (too large for JSON).
    // If we previously stored a thumbnail data URL, we can try to reconstruct a QImage from it.
    if (item.type == QStringLiteral("image") && !item.thumbnail.isEmpty()) {
        const int commaPos = item.thumbnail.indexOf(QLatin1Char(','));
        if (commaPos > 0) {
            const QString base64Str = item.thumbnail.mid(commaPos + 1);
            item.image = QImage::fromData(QByteArray::fromBase64(base64Str.toLatin1()), "PNG");
        }
    }

    return item;
}

QJsonObject HistoryStore::toJson(const ClipboardItem &item)
{
    return {
        { QStringLiteral("id"), item.id },
        { QStringLiteral("preview"), item.preview },
        { QStringLiteral("value"), item.value },
        { QStringLiteral("type"), item.type },
        { QStringLiteral("thumbnail"), item.thumbnail },
        { QStringLiteral("favorite"), item.favorite },
        { QStringLiteral("pinned"), item.pinned },
        { QStringLiteral("updatedAt"), item.updatedAt.toString(Qt::ISODate) },
    };
}

bool HistoryStore::load(const QString &path, QVector<ClipboardItem> &items)
{
    if (path.isEmpty()) {
        return false;
    }

    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) {
        return false;
    }

    const QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    file.close();

    if (!doc.isArray()) {
        return false;
    }

    const QJsonArray array = doc.array();
    items.clear();
    items.reserve(array.size());

    for (const QJsonValue &value : array) {
        if (value.isObject()) {
            items.append(fromJson(value.toObject()));
        }
    }

    return true;
}

bool HistoryStore::save(const QString &path, const QVector<ClipboardItem> &items)
{
    if (path.isEmpty()) {
        return false;
    }

    QJsonArray array;
    for (const ClipboardItem &item : items) {
        array.append(toJson(item));
    }

    QJsonDocument doc(array);

    QFile file(path);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        return false;
    }

    const qint64 written = file.write(doc.toJson(QJsonDocument::Compact));
    file.close();

    return written > 0;
}
