#pragma once

#include <QSortFilterProxyModel>
#include <QString>
#include <QVariantMap>

class HistoryFilterModel : public QSortFilterProxyModel {
    Q_OBJECT
    Q_PROPERTY(QString searchText READ searchText WRITE setSearchText NOTIFY searchTextChanged)
    Q_PROPERTY(QString category READ category WRITE setCategory NOTIFY categoryChanged)

public:
    explicit HistoryFilterModel(QObject *parent = nullptr);

    QString searchText() const;
    void setSearchText(const QString &text);

    QString category() const;
    void setCategory(const QString &category);

    Q_INVOKABLE QVariantMap get(int row) const;
    Q_INVOKABLE void toggleFavorite(int row);
    Q_INVOKABLE void togglePin(int row);
    Q_INVOKABLE bool removeItem(int row);
    Q_INVOKABLE bool copyItem(int row) const;
    Q_INVOKABLE bool pasteItem(int row) const;

signals:
    void searchTextChanged();
    void categoryChanged();

protected:
    bool filterAcceptsRow(int sourceRow, const QModelIndex &sourceParent) const override;

private:
    void refreshFilter();
    int sourceRowForProxyRow(int row) const;

    QString m_searchText;
    QString m_category = QStringLiteral("all");
};
