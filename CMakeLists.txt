cmake_minimum_required(VERSION 3.20)
project(PokemonCardDetector LANGUAGES CXX)

find_package(OpenCV REQUIRED)

include(FetchContent)
FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz DOWNLOAD_EXTRACT_TIMESTAMP OLD)
FetchContent_MakeAvailable(json)

include_directories(src)
include_directories(${OpenCV_INCLUDE_DIRS})

find_library(JSON_PARSER NAMES cppJsonParser REQUIRED)
find_library(HTTP_SERVER NAMES lightHTTPServer REQUIRED)

set(SRC_DIR src)


add_executable(PokemonCardDetector
    ${SRC_DIR}/main.cpp
)

target_link_libraries(PokemonCardDetector PRIVATE ${OpenCV_LIBS} ${JSON_PARSER} ${HTTP_SERVER} nlohmann_json::nlohmann_json)