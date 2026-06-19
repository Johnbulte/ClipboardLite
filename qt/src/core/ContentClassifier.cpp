#include "core/ContentClassifier.h"

#include <QRegularExpression>
#include <QStringList>

ContentClassifier::Type ContentClassifier::classifyText(const QString &text)
{
    const QString value = text.trimmed();
    if (value.isEmpty()) {
        return Type::Text;
    }

    static const QRegularExpression colorPattern(QStringLiteral("^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$"));
    if (colorPattern.match(value).hasMatch()) {
        return Type::Color;
    }

    if (looksLikeTable(value)) {
        return Type::Table;
    }

    static const QRegularExpression urlPattern(QStringLiteral("^(?:https?://|www\\.)\\S+$"));
    if (urlPattern.match(value).hasMatch()) {
        return Type::Link;
    }

    static const QRegularExpression emailPattern(QStringLiteral("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"));
    if (emailPattern.match(value).hasMatch()) {
        return Type::Email;
    }

    if (looksLikeCode(value)) {
        return Type::Code;
    }

    return Type::Text;
}

QString ContentClassifier::typeName(Type type)
{
    switch (type) {
    case Type::Text:
        return QStringLiteral("text");
    case Type::Link:
        return QStringLiteral("link");
    case Type::Email:
        return QStringLiteral("email");
    case Type::Color:
        return QStringLiteral("color");
    case Type::Code:
        return QStringLiteral("code");
    case Type::Table:
        return QStringLiteral("table");
    }
    return QStringLiteral("text");
}

bool ContentClassifier::looksLikeTable(const QString &value)
{
    const QStringList rows = value.split(QRegularExpression(QStringLiteral("\\r?\\n")), Qt::SkipEmptyParts);
    if (rows.size() < 2) {
        return false;
    }

    int expectedColumns = -1;
    for (const QString &row : rows) {
        const QChar delimiter = row.contains(QLatin1Char('\t')) ? QLatin1Char('\t') : QLatin1Char(',');
        const QStringList columns = row.split(delimiter);
        if (columns.size() < 2) {
            return false;
        }
        if (expectedColumns < 0) {
            expectedColumns = columns.size();
        } else if (columns.size() != expectedColumns) {
            return false;
        }
    }

    return true;
}

bool ContentClassifier::looksLikeCode(const QString &value)
{
    static const QRegularExpression keywordPattern(QStringLiteral("\\b(?:const|let|var|function|class|import|export|return|if|for|while|auto|QString|int|void)\\b"));
    return keywordPattern.match(value).hasMatch()
        || value.contains(QLatin1Char('{'))
        || value.contains(QLatin1Char('}'))
        || value.contains(QStringLiteral("=>"))
        || value.contains(QStringLiteral("::"));
}
