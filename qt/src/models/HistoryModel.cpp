#include "models/HistoryModel.h"

#include "core/ContentClassifier.h"

#include <QBuffer>
#include <QClipboard>
#include <QDateTime>
#include <QFileInfo>
#include <QGuiApplication>
#include <QMimeData>
#include <QIODevice>
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
}

bool HistoryModel::removeItem(int row)
{
    if (row < 0 || row >= m_items.size()) {
        return false;
    }

    beginRemoveRows({}, row, row);
    m_items.removeAt(row);
    endRemoveRows();
    return true;
}

void HistoryModel::clear()
{
    if (m_items.isEmpty()) {
        return;
    }

    beginRemoveRows({}, 0, m_items.size() - 1);
    m_items.clear();
    endRemoveRows();
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
}

void HistoryModel::addItem(const ClipboardItem &item)
{
    if (!m_items.isEmpty() && m_items.first().value == item.value) {
        return;
    }

    beginInsertRows({}, 0, 0);
    m_items.prepend(item);
    endInsertRows();
    trimToLimit();
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
        m_items[0] = item;
        emit dataChanged(index(0), index(0));
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

    beginRemoveRows({}, m_maxItems, m_items.size() - 1);
    m_items.erase(m_items.begin() + m_maxItems, m_items.end());
    endRemoveRows();
}
