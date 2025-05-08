#pragma once

#include <cstdint>
#include <string>
#include <filesystem>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <iostream>

#include "util.hpp"
#include "id-pair-container.hpp"
#include "bucket.hpp"

class PairingBucket : public Bucket<std::pair<uint64_t, uint64_t>, IdPairContainer> {
    public:
        PairingBucket(std::filesystem::path bucketPath, std::size_t startingSize);

        const std::unordered_set<uint64_t>* firstContents(uint64_t first);
    private:
        std::pair<uint64_t, uint64_t> FAKER();
        void deserialize(std::string_view str, void(*callback)(Bucket<std::pair<uint64_t, uint64_t>, IdPairContainer>& bucket, std::pair<uint64_t, uint64_t> item));
        std::string serialize(const IdPairContainer& contents);
};

class FileBucket : public Bucket<uint64_t, std::unordered_set<uint64_t>> {
    public:
        FileBucket(std::filesystem::path bucketPath, std::size_t startingSize);

    private:
        uint64_t FAKER();
        void deserialize(std::string_view str, void(*callback)(Bucket<uint64_t, std::unordered_set<uint64_t>>& bucket, uint64_t item));
        std::string serialize(const std::unordered_set<uint64_t>& contents);
};

class TagFileMaintainer {
    public:
        TagFileMaintainer(std::string folderName);
        ~TagFileMaintainer();

        void insertFiles(std::string_view input);
        void toggleFiles(std::string_view input);
        void deleteFiles(std::string_view input);
        void insertPairings(std::string_view input);
        void togglePairings(std::string_view input);
        void deletePairings(std::string_view input);
        void readFilesTags(std::string_view input);
        void search(std::string_view input);
        bool needsMaintenance();
        void doMaintenance();
        void close();
    private:
        void readCacheFile();
        void writeCacheFile();
        unsigned short getBucketIndex(uint64_t item) const;
        const PairingBucket& getTagBucket(uint64_t tag) const;
        PairingBucket& getTagBucket(uint64_t tag);
        const PairingBucket& getFileBucket(uint64_t file) const;
        PairingBucket& getFileBucket(uint64_t file);

        void modifyFiles(std::string_view input, void (FileBucket::*callback)(uint64_t));
        void modifyPairings(std::string_view input, void (PairingBucket::*callback)(std::pair<uint64_t, uint64_t>));

        const static int VERSION;

        bool closed_ = false;
        std::filesystem::path folderPath_;
        std::filesystem::path cacheFilePath_;
        unsigned short currentBucketCount = 16;
        std::vector<PairingBucket> tagFileBuckets;
        std::vector<PairingBucket> fileTagBuckets;
        std::unique_ptr<FileBucket> fileBucket;
};