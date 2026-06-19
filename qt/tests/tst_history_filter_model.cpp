#include "core/ClipboardItem.h"
#include "models/HistoryFilterModel.h"
#include "models/HistoryModel.h"

#include <QtTest/QtTest>

#include <QClipboard>
#include <utility>

class HistoryFilterModelTest : public QObject {
    Q_OBJECT

private slots:
    void filtersBySearchText();
    void filtersByCategory();
    void mapsRemoveToSourceRow();
    void mapsPinToSourceRow();
    void mapsPasteToSourceRow();
};

static ClipboardItem item(QString id, QString value, QString type, bool favorite = false)
{
    return ClipboardItem {
        std::move(id),
        value,
        value,
        std::move(type),
        QImage {},
        QString {},
        favorite,
        false,
        QDateTime::currentDateTime()
    };
}

void HistoryFilterModelTest::filtersBySearchText()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("invoice alpha"), QStringLiteral("text")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("https://example.com/docs"), QStringLiteral("link")));

    HistoryFilterModel filter;
    filter.setSourceModel(&model);
    filter.setSearchText(QStringLiteral("alpha"));

    QCOMPARE(filter.rowCount(), 1);
    QCOMPARE(filter.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("one"));
}

void HistoryFilterModelTest::filtersByCategory()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("plain note"), QStringLiteral("text")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("https://example.com/docs"), QStringLiteral("link")));

    HistoryFilterModel filter;
    filter.setSourceModel(&model);
    filter.setCategory(QStringLiteral("link"));

    QCOMPARE(filter.rowCount(), 1);
    QCOMPARE(filter.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("two"));
}

void HistoryFilterModelTest::mapsRemoveToSourceRow()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("plain note"), QStringLiteral("text")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("https://example.com/docs"), QStringLiteral("link")));

    HistoryFilterModel filter;
    filter.setSourceModel(&model);
    filter.setCategory(QStringLiteral("text"));

    QVERIFY(filter.removeItem(0));
    QCOMPARE(model.rowCount(), 1);
    QCOMPARE(model.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("two"));
}

void HistoryFilterModelTest::mapsPinToSourceRow()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("plain note"), QStringLiteral("text")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("https://example.com/docs"), QStringLiteral("link")));

    HistoryFilterModel filter;
    filter.setSourceModel(&model);
    filter.setCategory(QStringLiteral("text"));

    filter.togglePin(0);

    QCOMPARE(model.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("one"));
    QCOMPARE(model.get(0).value(QStringLiteral("pinned")).toBool(), true);
}

void HistoryFilterModelTest::mapsPasteToSourceRow()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("plain note"), QStringLiteral("text")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("https://example.com/docs"), QStringLiteral("link")));

    HistoryFilterModel filter;
    filter.setSourceModel(&model);
    filter.setCategory(QStringLiteral("text"));

    QVERIFY(filter.pasteItem(0));
    QCOMPARE(QGuiApplication::clipboard()->text(), QStringLiteral("plain note"));
}

QTEST_MAIN(HistoryFilterModelTest)
#include "tst_history_filter_model.moc"
