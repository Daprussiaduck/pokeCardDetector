cmake_minimum_required(VERSION 3.20)
project(PokemonCardDetector LANGUAGES CXX)

find_package(OpenCV REQUIRED)
include_directories(src)
include_directories(${OpenCV_INCLUDE_DIRS})

find_library(JSON_PARSER NAMES cppJsonParser REQUIRED)
find_library(HTTP_SERVER NAMES lightHTTPServer REQUIRED)

set(SRC_DIR src)


add_executable(PokemonCardDetector
    ${SRC_DIR}/main.cpp
)

target_link_libraries(PokemonCardDetector PRIVATE ${HTTP_SERVER})
target_link_libraries(PokemonCardDetector PRIVATE ${JSON_PARSER})
target_link_libraries(PokemonCardDetector ${OpenCV_LIBS})