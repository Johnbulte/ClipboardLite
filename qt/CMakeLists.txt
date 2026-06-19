cmake_minimum_required(VERSION 3.21)

project(CliplyQt VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Quick Test Widgets)

qt_standard_project_setup(REQUIRES 6.5)
qt_policy(SET QTP0004 NEW)

set(CLIPLY_CORE_SOURCES
    src/core/ContentClassifier.cpp
    src/models/HistoryFilterModel.cpp
    src/models/HistoryModel.cpp
)

set(CLIPLY_CORE_HEADERS
    src/core/ClipboardItem.h
    src/core/ContentClassifier.h
    src/models/HistoryFilterModel.h
    src/models/HistoryModel.h
)

qt_add_executable(cliply_qt
    src/main.cpp
    ${CLIPLY_CORE_SOURCES}
    ${CLIPLY_CORE_HEADERS}
)

target_include_directories(cliply_qt PRIVATE src)
target_link_libraries(cliply_qt PRIVATE Qt6::Core Qt6::Gui Qt6::Quick Qt6::Widgets)

qt_add_qml_module(cliply_qt
    URI Cliply
    VERSION 1.0
    QML_FILES
        qml/Main.qml
        qml/QuickPanel.qml
        qml/components/CategorySidebar.qml
        qml/components/HistoryList.qml
        qml/components/DetailPanel.qml
        qml/components/PlanComparisonDialog.qml
)

enable_testing()

qt_add_executable(tst_content_classifier
    tests/tst_content_classifier.cpp
    src/core/ContentClassifier.cpp
    src/core/ContentClassifier.h
)

target_include_directories(tst_content_classifier PRIVATE src)
target_link_libraries(tst_content_classifier PRIVATE Qt6::Core Qt6::Test)

add_test(NAME content_classifier COMMAND tst_content_classifier)

qt_add_executable(tst_history_model
    tests/tst_history_model.cpp
    src/core/ContentClassifier.cpp
    src/core/ContentClassifier.h
    src/models/HistoryModel.cpp
    src/models/HistoryModel.h
    src/core/ClipboardItem.h
)

target_include_directories(tst_history_model PRIVATE src)
target_link_libraries(tst_history_model PRIVATE Qt6::Core Qt6::Gui Qt6::Test)

add_test(NAME history_model COMMAND tst_history_model)

qt_add_executable(tst_history_filter_model
    tests/tst_history_filter_model.cpp
    src/core/ContentClassifier.cpp
    src/core/ContentClassifier.h
    src/models/HistoryFilterModel.cpp
    src/models/HistoryFilterModel.h
    src/models/HistoryModel.cpp
    src/models/HistoryModel.h
    src/core/ClipboardItem.h
)

target_include_directories(tst_history_filter_model PRIVATE src)
target_link_libraries(tst_history_filter_model PRIVATE Qt6::Core Qt6::Gui Qt6::Test)

add_test(NAME history_filter_model COMMAND tst_history_filter_model)

qt_add_executable(tst_desktop_integration_contract
    tests/tst_desktop_integration_contract.cpp
)

target_compile_definitions(tst_desktop_integration_contract PRIVATE
    SOURCE_ROOT="${CMAKE_CURRENT_SOURCE_DIR}"
)
target_link_libraries(tst_desktop_integration_contract PRIVATE Qt6::Core Qt6::Test)

add_test(NAME desktop_integration_contract COMMAND tst_desktop_integration_contract)
