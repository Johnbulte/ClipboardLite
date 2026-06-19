#include "core/ContentClassifier.h"

#include <QtTest/QtTest>

class ContentClassifierTest : public QObject {
    Q_OBJECT

private slots:
    void classifiesPlainText();
    void classifiesLinks();
    void classifiesEmail();
    void classifiesColor();
    void classifiesCode();
    void classifiesTable();
};

void ContentClassifierTest::classifiesPlainText()
{
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("hello world")), ContentClassifier::Type::Text);
}

void ContentClassifierTest::classifiesLinks()
{
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("https://example.com/path")), ContentClassifier::Type::Link);
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("www.example.com")), ContentClassifier::Type::Link);
}

void ContentClassifierTest::classifiesEmail()
{
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("alice@example.com")), ContentClassifier::Type::Email);
}

void ContentClassifierTest::classifiesColor()
{
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("#ff7a18")), ContentClassifier::Type::Color);
}

void ContentClassifierTest::classifiesCode()
{
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("const value = clipboard.readText();")), ContentClassifier::Type::Code);
}

void ContentClassifierTest::classifiesTable()
{
    QCOMPARE(ContentClassifier::classifyText(QStringLiteral("name\temail\nAlice\talice@example.com")), ContentClassifier::Type::Table);
}

QTEST_MAIN(ContentClassifierTest)
#include "tst_content_classifier.moc"
