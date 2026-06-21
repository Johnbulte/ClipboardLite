#include "models/HistoryModel.h"

#include "core/ContentClassifier.h"
#include "core/HistoryStore.h"

#include <QBuffer>
#include <QClipboard>
#include <QDateTime>
#include <QFileInfo>
#include <QGuiApplication>
#include <QMimeData>
#include <QIODevice>
#include <QJsonDocument>
#include <QUrl>
#include <QUuid>

static QString imageToDataUrl(const QImage &image)
{
    if (image.isNull()) {
        return {};
    }

    QByteArray bytes;
    QBuffer buffer(&bytes);
    buffer.open(QIODevice::WriteOnly);
    image.scaled(320, 320, Qt::KeepAspectRatio, Qt::SmoothTransformation).save(&buffer, "PNG");
    return QStringLiteral("data:image/png;base64,") + QString::fromLatin1(bytes.toBase64());
}

HistoryModel::HistoryModel(QObject *parent)
    : QAbstractListModel(parent)
{
    m_storePath = HistoryStore::defaultPath();
    m_saveTimer.setSingleShot(true);
    m_saveTimer.setInterval(500);
    connect(&m_saveTimer, &QTimer::timeout, this, &HistoryModel::save);
}

int HistoryModel::rowCount(const QModelIndex &parent) const
{
    if (parent.isValid()) {
        return 0;
    }
    return m_items.size();
}

QVariant HistoryModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid() || index.row() < 0 || index.row() >= m_items.size()) {
        return {};
    }

    const ClipboardItem &item = m_items.at(index.row());
    switch (role) {
    case IdRole:
        return item.id;
    case PreviewRole:
        return item.preview;
    case ValueRole:
        return item.value;
    case TypeRole:
        return item.type;
    case FavoriteRole:
        return item.favorite;
    case PinnedRole:
        return item.pinned;
    case UpdatedAtRole:
        return item.updatedAt.toString(QStringLiteral("MM-dd HH:mm"));
    case ThumbnailRole:
        return item.thumbnail;
    default:
        return {};
    }
}

QHash<int, QByteArray> HistoryModel::roleNames() const
{
    return {
        { IdRole, "itemId" },
        { PreviewRole, "preview" },
        { ValueRole, "value" },
        { TypeRole, "type" },
        { FavoriteRole, "favorite" },
        { PinnedRole, "pinned" },
        { UpdatedAtRole, "updatedAt" },
        { ThumbnailRole, "thumbnail" }
    };
}

QVariantMap HistoryModel::get(int row) const
{
    if (row < 0 || row >= m_items.size()) {
        return {};
    }

    const ClipboardItem &item = m_items.at(row);
    return {
        { QStringLiteral("itemId"), item.id },
        { QStringLiteral("preview"), item.preview },
        { QStringLiteral("value"), item.value },
        { QStringLiteral("type"), item.type },
        { QStringLiteral("favorite"), item.favorite },
        { QStringLiteral("pinned"), item.pinned },
        { QStringLiteral("updatedAt"), item.updatedAt.toString(QStringLiteral("MM-dd HH:mm")) },
        { QStringLiteral("thumbnail"), item.thumbnail }
    };
}

void HistoryModel::toggleFavorite(int row)
{
    if (row < 0 || row >= m_items.size()) {
        return;
    }

    m_items[row].favorite = !m_items[row].favorite;
    const QModelIndex changed = index(row);
    emit dataChanged(changed, changed, { FavoriteRole });
    scheduleSave();
}

void HistoryModel::togglePin(int row)
{
    if (row < 0 || row >= m_items.size()) {
        return;
    }

    const bool nextPinned = !m_items[row].pinned;
    const int targetRow = nextPinned ? 0 : m_items.size() - 1;
    if (row != targetRow) {
        beginMoveRows({}, row, row, {}, nextPinned ? 0 : m_items.size());
        ClipboardItem item = m_items.takeAt(row);
        item.pinned = nextPinned;
        m_items.insert(targetRow, item);
        endMoveRows();
    } else {
        m_items[row].pinned = nextPinned;
    }

    const QModelIndex changed = index(targetRow);
    emit dataChanged(changed, changed, { PinnedRole });
    scheduleSave();
}

bool HistoryModel::removeItem(int row)
{
    if (row < 0 || row >= m_items.size()) {
        return false;
    }

    const QString value = m_items[row].value;
    const QString type = m_items[row].type;
    const QString dedupeKey = type + QLatin1Char('|') + value;
    if (m_valueIndex.value(dedupeKey, -1) == row) {
        m_valueIndex.remove(dedupeKey);
    }

    beginRemoveRows({}, row, row);
    m_items.removeAt(row);
    endRemoveRows();

    // Rebuild index for items after the removed row
    for (int i = row; i < m_items.size(); ++i) {
        const QString key = m_items[i].type + QLatin1Char('|') + m_items[i].value;
        m_valueIndex[key] = i;
    }

    scheduleSave();
    return true;
}

void HistoryModel::clear()
{
    if (m_items.isEmpty()) {
        return;
    }

    beginRemoveRows({}, 0, m_items.size() - 1);
    m_items.clear();
    m_valueIndex.clear();
    endRemoveRows();
    scheduleSave();
}

bool HistoryModel::copyItem(int row) const
{
    if (row < 0 || row >= m_items.size()) {
        return false;
    }

    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) {
        return false;
    }

    const ClipboardItem &item = m_items.at(row);
    if (item.type == QStringLiteral("image")) {
        auto *mimeData = new QMimeData;
        if (!item.image.isNull()) {
            mimeData->setImageData(item.image);
        }
        const QFileInfo fileInfo(item.value);
        if (fileInfo.exists()) {
            mimeData->setUrls({ QUrl::fromLocalFile(fileInfo.absoluteFilePath()) });
        }
        clipboard->setMimeData(mimeData);
        return true;
    }

    clipboard->setText(item.value);
    return true;
}

int HistoryModel::favoriteCount() const
{
    int count = 0;
    for (const ClipboardItem &item : m_items) {
        if (item.favorite) {
            ++count;
        }
    }
    return count;
}

int HistoryModel::typeCount(const QString &type) const
{
    int count = 0;
    for (const ClipboardItem &item : m_items) {
        if (item.type.compare(type, Qt::CaseInsensitive) == 0) {
            ++count;
        }
    }
    return count;
}

QVariantMap HistoryModel::categoryCounts() const
{
    int textCount = 0, linkCount = 0, codeCount = 0, emailCount = 0, colorCount = 0, tableCount = 0, favCount = 0;
    for (const ClipboardItem &item : m_items) {
        if (item.favorite) {
            ++favCount;
        }
        if (item.type == QStringLiteral("text")) {
            ++textCount;
        } else if (item.type == QStringLiteral("link")) {
            ++linkCount;
        } else if (item.type == QStringLiteral("code")) {
            ++codeCount;
        } else if (item.type == QStringLiteral("email")) {
            ++emailCount;
        } else if (item.type == QStringLiteral("color")) {
            ++colorCount;
        } else if (item.type == QStringLiteral("table")) {
            ++tableCount;
        }
    }
    return {
        { QStringLiteral("total"), m_items.size() },
        { QStringLiteral("favorite"), favCount },
        { QStringLiteral("text"), textCount },
        { QStringLiteral("link"), linkCount },
        { QStringLiteral("code"), codeCount },
        { QStringLiteral("email"), emailCount },
        { QStringLiteral("color"), colorCount },
        { QStringLiteral("table"), tableCount },
    };
}

int HistoryModel::maxItems() const
{
    return m_maxItems;
}

void HistoryModel::setMaxItems(int maxItems)
{
    const int next = clampMaxItems(maxItems);
    if (m_maxItems == next) {
        return;
    }

    m_maxItems = next;
    emit maxItemsChanged();
    trimToLimit();
    scheduleSave();
}

bool HistoryModel::proEnabled() const
{
    return m_proEnabled;
}

void HistoryModel::setProEnabled(bool enabled)
{
    if (m_proEnabled == enabled) {
        return;
    }

    m_proEnabled = enabled;
    emit proEnabledChanged();
    setMaxItems(m_maxItems);
    trimToLimit();
    scheduleSave();
}

bool HistoryModel::containsValue(const QString &value, const QString &type) const
{
    const QString dedupeKey = (type.isEmpty() ? QString() : type) + QLatin1Char('|') + value;
    return m_valueIndex.contains(dedupeKey);
}

void HistoryModel::addItem(const ClipboardItem &item)
{
    const QString dedupeKey = item.type + QLatin1Char('|') + item.value;

    // Deduplicate: if the same value+type already exists, move it to the top instead of adding a duplicate
    const int existingRow = m_valueIndex.value(dedupeKey, -1);
    if (existingRow >= 0 && existingRow < m_items.size()) {
        if (existingRow == 0) {
            // Already at the top, just update the timestamp
            m_items[0].updatedAt = item.updatedAt;
            const QModelIndex changed = index(0);
            emit dataChanged(changed, changed, { UpdatedAtRole });
            scheduleSave();
            return;
        }

        // Move existing item to top
        beginMoveRows({}, existingRow, existingRow, {}, 0);
        ClipboardItem moved = m_items.takeAt(existingRow);
        moved.updatedAt = item.updatedAt;
        m_items.prepend(moved);
        endMoveRows();

        // Rebuild value index for affected items
        for (int i = 0; i <= existingRow && i < m_items.size(); ++i) {
            const QString key = m_items[i].type + QLatin1Char('|') + m_items[i].value;
            m_valueIndex[key] = i;
        }

        scheduleSave();
        return;
    }

    beginInsertRows({}, 0, 0);
    m_items.prepend(item);
    endInsertRows();

    // Update value index: shift all existing entries by 1
    QHash<QString, int> newIndex;
    newIndex.reserve(m_valueIndex.size() + 1);
    for (auto it = m_valueIndex.begin(); it != m_valueIndex.end(); ++it) {
        newIndex[it.key()] = it.value() + 1;
    }
    newIndex[dedupeKey] = 0;
    m_valueIndex = std::move(newIndex);

    trimToLimit();
    scheduleSave();
}

void HistoryModel::addText(const QString &value)
{
    const QString trimmed = value.trimmed();
    if (trimmed.isEmpty()) {
        return;
    }

    const auto type = ContentClassifier::classifyText(trimmed);
    QString preview = trimmed.simplified();
    if (preview.size() > 120) {
        preview = preview.left(117) + QStringLiteral("...");
    }

    addItem(ClipboardItem {
        QUuid::createUuid().toString(QUuid::WithoutBraces),
        preview,
        trimmed,
        ContentClassifier::typeName(type),
        QImage {},
        QString {},
        false,
        false,
        QDateTime::currentDateTime()
    });
}

void HistoryModel::addImagePath(const QString &path)
{
    const QString trimmed = path.trimmed();
    if (trimmed.isEmpty()) {
        return;
    }

    const QFileInfo fileInfo(trimmed);
    const QString fileName = fileInfo.fileName().isEmpty() ? trimmed : fileInfo.fileName();
    const QImage image(trimmed);

    ClipboardItem item {
        QUuid::createUuid().toString(QUuid::WithoutBraces),
        QStringLiteral("图片 ") + fileName,
        trimmed,
        QStringLiteral("image"),
        image,
        imageToDataUrl(image),
        false,
        false,
        QDateTime::currentDateTime()
    };

    if (!m_items.isEmpty()
        && m_items.first().type == QStringLiteral("image")
        && m_items.first().value == QStringLiteral("__clipboard_image__")) {
        const QString oldKey = m_items[0].type + QLatin1Char('|') + m_items[0].value;
        m_valueIndex.remove(oldKey);
        m_items[0] = item;
        const QString newKey = item.type + QLatin1Char('|') + item.value;
        m_valueIndex[newKey] = 0;
        emit dataChanged(index(0), index(0));
        scheduleSave();
        return;
    }

    addItem(item);
}

void HistoryModel::addImage(const QImage &image)
{
    if (image.isNull()) {
        return;
    }

    addItem(ClipboardItem {
        QUuid::createUuid().toString(QUuid::WithoutBraces),
        QStringLiteral("Image %1x%2").arg(image.width()).arg(image.height()),
        QStringLiteral("__clipboard_image__"),
        QStringLiteral("image"),
        image,
        imageToDataUrl(image),
        false,
        false,
        QDateTime::currentDateTime()
    });
}

bool HistoryModel::load()
{
    HistoryStore store;
    QVector<ClipboardItem> loaded;
    if (!store.load(m_storePath, loaded)) {
        return false;
    }

    beginResetModel();
    m_items = std::move(loaded);
    m_valueIndex.clear();
    m_valueIndex.reserve(m_items.size());
    for (int i = 0; i < m_items.size(); ++i) {
        const QString key = m_items[i].type + QLatin1Char('|') + m_items[i].value;
        m_valueIndex[key] = i;
    }
    endResetModel();
    return true;
}

bool HistoryModel::save()
{
    HistoryStore store;
    return store.save(m_storePath, m_items);
}

void HistoryModel::scheduleSave()
{
    if (!m_saveTimer.isActive()) {
        m_saveTimer.start();
    }
}

int HistoryModel::historyLimit() const
{
    return m_proEnabled ? 2000 : 100;
}

int HistoryModel::clampMaxItems(int value) const
{
    return qBound(20, value <= 0 ? historyLimit() : value, historyLimit());
}

void HistoryModel::trimToLimit()
{
    if (m_items.size() <= m_maxItems) {
        return;
    }

    const int removedFrom = m_maxItems;
    beginRemoveRows({}, removedFrom, m_items.size() - 1);

    // Remove trimmed items from value index
    for (int i = removedFrom; i < m_items.size(); ++i) {
        const QString key = m_items[i].type + QLatin1Char('|') + m_items[i].value;
        m_valueIndex.remove(key);
    }

    m_items.erase(m_items.begin() + m_maxItems, m_items.end());
    endRemoveRows();
}
