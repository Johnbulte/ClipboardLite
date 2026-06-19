#include "core/ClipboardItem.h"
#include "models/HistoryModel.h"

#include <QtTest/QtTest>

#include <QClipboard>
#include <QGuiApplication>
#include <QImage>
#include <QMimeData>
#include <QTemporaryDir>

#include <utility>

class HistoryModelTest : public QObject {
    Q_OBJECT

private slots:
    void removeItemDeletesRequestedRow();
    void clearRemovesEveryItem();
    void addItemSkipsConsecutiveDuplicate();
    void addImagePathStoresImageInsteadOfText();
    void addImageExposesThumbnailDataUrl();
    void copyImagePathWritesImageToClipboard();
    void togglePinMovesItemToTop();
    void defaultsToFreePlan();
    void freePlanKeepsAtMostOneHundredItems();
    void proPlanCanKeepTwoThousandItems();
};

static ClipboardItem item(QString id, QString value)
{
    return ClipboardItem {
        std::move(id),
        value,
        value,
        QStringLiteral("text"),
        QImage {},
        QString {},
        false,
        false,
        QDateTime::currentDateTime()
    };
}

void HistoryModelTest::removeItemDeletesRequestedRow()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("first")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("second")));

    QCOMPARE(model.rowCount(), 2);
    QVERIFY(model.removeItem(0));

    QCOMPARE(model.rowCount(), 1);
    QCOMPARE(model.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("one"));
}

void HistoryModelTest::clearRemovesEveryItem()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("first")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("second")));

    model.clear();

    QCOMPARE(model.rowCount(), 0);
    QVERIFY(model.get(0).isEmpty());
}

void HistoryModelTest::addItemSkipsConsecutiveDuplicate()
{
    HistoryModel model;

    model.addItem(item(QStringLiteral("one"), QStringLiteral("same")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("same")));

    QCOMPARE(model.rowCount(), 1);
    QCOMPARE(model.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("one"));
}

void HistoryModelTest::addImagePathStoresImageInsteadOfText()
{
    HistoryModel model;

    model.addImagePath(QStringLiteral("D:/WeChatFiles/temp/photo.jpg"));

    QCOMPARE(model.rowCount(), 1);
    QCOMPARE(model.get(0).value(QStringLiteral("type")).toString(), QStringLiteral("image"));
    QCOMPARE(model.get(0).value(QStringLiteral("value")).toString(), QStringLiteral("D:/WeChatFiles/temp/photo.jpg"));
    QVERIFY(model.get(0).value(QStringLiteral("preview")).toString().contains(QStringLiteral("photo.jpg")));
}

void HistoryModelTest::addImageExposesThumbnailDataUrl()
{
    QImage source(4, 4, QImage::Format_ARGB32);
    source.fill(Qt::blue);

    HistoryModel model;
    model.addImage(source);

    const QString thumbnail = model.get(0).value(QStringLiteral("thumbnail")).toString();
    QVERIFY(thumbnail.startsWith(QStringLiteral("data:image/png;base64,")));
    QVERIFY(thumbnail.size() > QStringLiteral("data:image/png;base64,").size());
}

void HistoryModelTest::copyImagePathWritesImageToClipboard()
{
    QTemporaryDir dir;
    QVERIFY(dir.isValid());
    const QString imagePath = dir.filePath(QStringLiteral("photo.png"));
    QImage source(2, 2, QImage::Format_ARGB32);
    source.fill(Qt::red);
    QVERIFY(source.save(imagePath));

    HistoryModel model;
    model.addImagePath(imagePath);

    QVERIFY(model.copyItem(0));
    QClipboard *clipboard = QGuiApplication::clipboard();
    QVERIFY(clipboard);
    QVERIFY(!clipboard->image().isNull());
    QVERIFY(clipboard->text() != imagePath);
}

void HistoryModelTest::togglePinMovesItemToTop()
{
    HistoryModel model;
    model.addItem(item(QStringLiteral("one"), QStringLiteral("first")));
    model.addItem(item(QStringLiteral("two"), QStringLiteral("second")));

    model.togglePin(1);

    QCOMPARE(model.get(0).value(QStringLiteral("itemId")).toString(), QStringLiteral("one"));
    QCOMPARE(model.get(0).value(QStringLiteral("pinned")).toBool(), true);
}

void HistoryModelTest::defaultsToFreePlan()
{
    HistoryModel model;

    QCOMPARE(model.proEnabled(), false);
    QCOMPARE(model.maxItems(), 100);
}

void HistoryModelTest::freePlanKeepsAtMostOneHundredItems()
{
    HistoryModel model;
    model.setProEnabled(false);
    model.setMaxItems(2000);

    for (int i = 0; i < 105; ++i) {
        model.addItem(item(QString::number(i), QStringLiteral("value-%1").arg(i)));
    }

    QCOMPARE(model.maxItems(), 100);
    QCOMPARE(model.rowCount(), 100);
    QCOMPARE(model.get(0).value(QStringLiteral("value")).toString(), QStringLiteral("value-104"));
    QCOMPARE(model.get(99).value(QStringLiteral("value")).toString(), QStringLiteral("value-5"));
}

void HistoryModelTest::proPlanCanKeepTwoThousandItems()
{
    HistoryModel model;
    model.setProEnabled(true);
    model.setMaxItems(2000);

    for (int i = 0; i < 150; ++i) {
        model.addItem(item(QString::number(i), QStringLiteral("value-%1").arg(i)));
    }

    QCOMPARE(model.maxItems(), 2000);
    QCOMPARE(model.rowCount(), 150);
    QCOMPARE(model.get(149).value(QStringLiteral("value")).toString(), QStringLiteral("value-0"));
}

QTEST_MAIN(HistoryModelTest)
#include "tst_history_model.moc"
