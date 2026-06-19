#pragma once

#include <QString>

class ContentClassifier {
public:
    enum class Type {
        Text,
        Link,
        Email,
        Color,
        Code,
        Table
    };

    static Type classifyText(const QString &text);
    static QString typeName(Type type);

private:
    static bool looksLikeTable(const QString &value);
    static bool looksLikeCode(const QString &value);
};
