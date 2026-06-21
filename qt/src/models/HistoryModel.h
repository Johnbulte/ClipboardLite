#pragma once

#include "core/ClipboardItem.h"

#include <QAbstractListModel>
#include <QHash>
#include <QTimer>
#include <QVector>

class HistoryModel : public QAbstractListModel {
    Q_OBJECT
    Q_PROPERTY(int maxItems READ maxItems WRITE setMaxItems NOTIFY maxItemsChanged)
    Q_PROPERTY(bool proEnabled READ proEnabled WRITE setProEnabled NOTIFY proEnabledChanged)

public:
    enum Role {
        IdRole = Qt::UserRole + 1,
        PreviewRole,
        ValueRole,
        TypeRole,
        FavoriteRole,
        PinnedRole,
        UpdatedAtRole,
        ThumbnailRole
    };

    explicit HistoryModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    Q_INVOKABLE QVariantMap get(int row) const;
    Q_INVOKABLE void toggleFavorite(int row);
    Q_INVOKABLE void togglePin(int row);
    Q_INVOKABLE bool removeItem(int row);
    Q_INVOKABLE bool copyItem(int row) const;
    Q_INVOKABLE void clear();
    Q_INVOKABLE int favoriteCount() const;
    Q_INVOKABLE int typeCount(const QString &type) const;
    Q_INVOKABLE QVariantMap categoryCounts() const;
    Q_INVOKABLE void addText(const QString &value);
    Q_INVOKABLE void addImagePath(const QString &path);
    Q_INVOKABLE bool load();
    Q_INVOKABLE bool save();
    int maxItems() const;
    void setMaxItems(int maxItems);
    bool proEnabled() const;
    void setProEnabled(bool enabled);
    void addImage(const QImage &image);

    void addItem(const ClipboardItem &item);

signals:
    void maxItemsChanged();
    void proEnabledChanged();

private:
    int historyLimit() const;
    int clampMaxItems(int value) const;
    void trimToLimit();
    void scheduleSave();
    bool containsValue(const QString &value, const QString &type = QString()) const;

    QVector<ClipboardItem> m_items;
    QHash<QString, int> m_valueIndex;
    QString m_storePath;
    QTimer m_saveTimer;
    int m_maxItems = 100;
    bool m_proEnabled = false;
};
