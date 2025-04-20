#include "CardDatabase.hpp"

namespace PokemonCardDetector {
    CardDatabase::CardDatabase(std::string cachePath){
        this -> databaseCache = cachePath + "/DBs";
        if (!std::filesystem::exists(this -> databaseCache)){
            std::filesystem::create_directories(this -> databaseCache);
        }
        this -> imageCache = cachePath + "/Images";
        if (!std::filesystem::exists(this -> imageCache)){
            std::filesystem::create_directories(this -> imageCache);
        }
        this -> pool = new lightHTTPServer::ThreadPool(-1);
        this -> apiHandle = new pokemon_tcg_sdk::API();
    };

    CardDatabase::~CardDatabase(){
        if ((this -> pool) != nullptr){
            this -> pool -> stop();
            delete (this -> pool);
        }
        if ((this -> apiHandle) != nullptr){
            delete (this -> apiHandle);
        }
    }

    bool CardDatabase::exportToCSV(std::string filePath){
        return false;
    }

    std::string CardDatabase::hashImage(cv::Mat image){
        return "";
    }

    void CardDatabase::updateDB(){
        std::vector<pokemon_tcg_sdk::Set> newSets = pokemon_tcg_sdk::Set::all(this -> apiHandle);
        for (pokemon_tcg_sdk::Set set : sets){
            std::string setCacheDir = this -> databaseCache + "/" + set.getID();
            if (!std::filesystem::exists(setCacheDir)){
                if (!std::filesystem::exists(setCacheDir)){
                    std::filesystem::create_directories(setCacheDir);
                }
                std::cout << "Running update for " << set.getID() << std::endl;
                this -> updateSet(set.getID());
            }
        }
    }

    void CardDatabase::updateCard(std::string cardID){
        std::cout << "Hi" << cardID << std::endl;
    }

    void CardDatabase::updateSet(std::string setID){
        std::unique_lock<std::mutex> lock(this -> poolMootex);
        std::vector<pokemon_tcg_sdk::Card> cards = pokemon_tcg_sdk::Card::where(this -> apiHandle, "set.id:" + setID);
        for (pokemon_tcg_sdk::Card card : cards){
            std::string cardID = card.getID();
            this -> pool -> addTask([this, cardID]{
                std::cout << "Running update for " << cardID << std::endl;
                this -> updateCard(cardID);
            });
        }
        // std::unique_lock<std::mutex> unlock(this -> poolMootex);
    }


};