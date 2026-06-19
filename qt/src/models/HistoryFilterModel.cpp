#include "models/HistoryFilterModel.h"

#include "models/HistoryModel.h"

HistoryFilterModel::HistoryFilterModel(QObject *parent)
    : QSortFilterProxyModel(parent)
{
    setDynamicSortFilter(true);
}

QString HistoryFilterModel::searchText() const
{
    return m_searchText;
}

void HistoryFilterModel::setSearchText(const QString &text)
{
    const QString normalized = text.trimmed();
    if (m_searchText == normalized) {
        return;
    }

    m_searchText = normalized;
    refreshFilter();
    emit searchTextChanged();
}

QString HistoryFilterModel::category() const
{
    return m_category;
}

void HistoryFilterModel::setCategory(const QString &category)
{
    const QString normalized = category.trimmed().isEmpty() ? QStringLiteral("all") : category.trimmed().toLower();
    if (m_category == normalized) {
        return;
    }

    m_category = normalized;
    refreshFilter();
    emit categoryChanged();
}

QVariantMap HistoryFilterModel::get(int row) const
{
    auto *history = qobject_cast<HistoryModel *>(sourceModel());
    if (!history) {
        return {};
    }

    const int sourceRow = sourceRowForProxyRow(row);
    return sourceRow >= 0 ? history->get(sourceRow) : QVariantMap {};
}

void HistoryFilterModel::toggleFavorite(int row)
{
    auto *history = qobject_cast<HistoryModel *>(sourceModel());
    if (!history) {
        return;
    }

    const int sourceRow = sourceRowForProxyRow(row);
    if (sourceRow >= 0) {
        history->toggleFavorite(sourceRow);
        refreshFilter();
    }
}

void HistoryFilterModel::togglePin(int row)
{
    auto *history = qobject_cast<HistoryModel *>(sourceModel());
    if (!history) {
        return;
    }

    const int sourceRow = sourceRowForProxyRow(row);
    if (sourceRow >= 0) {
        history->togglePin(sourceRow);
        refreshFilter();
    }
}

bool HistoryFilterModel::removeItem(int row)
{
    auto *history = qobject_cast<HistoryModel *>(sourceModel());
    if (!history) {
        return false;
    }

    const int sourceRow = sourceRowForProxyRow(row);
    return sourceRow >= 0 && history->removeItem(sourceRow);
}

bool HistoryFilterModel::copyItem(int row) const
{
    auto *history = qobject_cast<HistoryModel *>(sourceModel());
    if (!history) {
        return false;
    }

    const int sourceRow = sourceRowForProxyRow(row);
    return sourceRow >= 0 && history->copyItem(sourceRow);
}

bool HistoryFilterModel::pasteItem(int row) const
{
    return copyItem(row);
}

bool HistoryFilterModel::filterAcceptsRow(int sourceRow, const QModelIndex &sourceParent) const
{
    const QModelIndex sourceIndex = sourceModel()->index(sourceRow, 0, sourceParent);
    if (!sourceIndex.isValid()) {
        return false;
    }

    const QString type = sourceIndex.data(HistoryModel::TypeRole).toString().toLower();
    const bool favorite = sourceIndex.data(HistoryModel::FavoriteRole).toBool();

    if (m_category == QStringLiteral("favorite")) {
        if (!favorite) {
            return false;
        }
    } else if (m_category != QStringLiteral("all") && type != m_category) {
        return false;
    }

    if (m_searchText.isEmpty()) {
        return true;
    }

    const QString haystack = sourceIndex.data(HistoryModel::PreviewRole).toString()
        + QLatin1Char('\n')
        + sourceIndex.data(HistoryModel::ValueRole).toString()
        + QLatin1Char('\n')
        + type;
    return haystack.contains(m_searchText, Qt::CaseInsensitive);
}

int HistoryFilterModel::sourceRowForProxyRow(int row) const
{
    if (row < 0 || row >= rowCount()) {
        return -1;
    }

    return mapToSource(index(row, 0)).row();
}

void HistoryFilterModel::refreshFilter()
{
#if QT_VERSION >= QT_VERSION_CHECK(6, 10, 0)
    beginFilterChange();
    endFilterChange(QSortFilterProxyModel::Direction::Rows);
#else
    invalidateFilter();
#endif
}
