#ifndef __CARD_DATABASE_HPP__
#define __CARD_DATABASE_HPP__

#include <pokemon-tcg-sdk-cpp/pokemon-tcg-sdk.hpp>
#include <lightHTTPServer/ThreadPool.hpp>
#include <opencv2/core/mat.hpp>
#include <nlohmann/json.hpp>
#include <condition_variable>
#include <iostream>
#include <string>
#include <vector>
#include <mutex>

namespace PokemonCardDetector {
    struct Card {
        pokemon_tcg_sdk::Card card;
        std::string imgHashBase64;
    };

    class CardDatabase {
        public:
            CardDatabase(std::string cachePath = "./CardCache");
            ~CardDatabase();

            bool exportToCSV(std::string filePath);
            std::string hashImage(cv::Mat image);
            void updateDB();
            bool loadCache();
        private:
            void updateCard(std::string cardID);
            void updateSet(std::string setID);
            void saveSets();

            pokemon_tcg_sdk::API* apiHandle = nullptr;
            std::string databaseCache = "";
            std::string imageCache = "";
            lightHTTPServer::ThreadPool* pool = nullptr;
            std::mutex poolMootex;
            std::vector<pokemon_tcg_sdk::Set> sets;
            std::vector<pokemon_tcg_sdk::Card> cards;
    };
};

#endif /*__CARD_DATABASE_HPP__*/