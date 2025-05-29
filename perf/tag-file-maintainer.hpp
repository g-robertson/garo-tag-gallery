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
#include "set-evaluation.hpp"

class PairingBucket : public Bucket<std::pair<uint64_t, uint64_t>, IdPairContainer, IdPairDiffContainer> {
    public:
        PairingBucket(std::filesystem::path bucketPath, std::size_t startingSize, std::size_t startingComplementCount, const std::unordered_set<uint64_t>* secondUniverse);

        const IdPairSecond* firstContents(uint64_t first);
        std::size_t startingComplementCount() const;
        void insertComplement(uint64_t second);
    private:
        std::size_t startingComplementCount_;
        const std::unordered_set<uint64_t>* secondUniverse;
        std::unordered_set<uint64_t> startingFirstComplements;
        
        std::pair<uint64_t, uint64_t> FAKER() const override;

        IdPairContainer deserialize(std::string_view str) const override;
        IdPairDiffContainer deserializeDiff(std::string_view str) const override;
        std::string serialize(const IdPairContainer& contents) const override;
        std::string serializeDiff(const IdPairDiffContainer& diffContents) const override;

        bool isErased(const IdPairInsertReturnType& eraseReturn) const override;
        void applyDiff(const IdPairDiffContainer& diffContents) override;
        void postContentsMatchFile() override;
};

class SingleBucket : public Bucket<uint64_t, std::unordered_set<uint64_t>, std::unordered_set<uint64_t>> {
    public:
        SingleBucket(std::filesystem::path bucketPath, std::size_t startingSize);

    private:
        uint64_t FAKER() const override;

        std::unordered_set<uint64_t> deserialize(std::string_view str) const override;
        std::unordered_set<uint64_t> deserializeDiff(std::string_view str) const override;
        std::string serialize(const std::unordered_set<uint64_t>& contents) const override;
        std::string serializeDiff(const std::unordered_set<uint64_t>& diffContents) const override;

        bool isErased(const std::size_t& eraseReturn) const override;
        void applyDiff(const std::unordered_set<uint64_t>& diffContents) override;
};

class TagFileMaintainer {
    public:
        TagFileMaintainer(std::string folderName);
        ~TagFileMaintainer();

        void insertFiles(std::string_view input);
        void toggleFiles(std::string_view input);
        void deleteFiles(std::string_view input);
        void readFiles();
        void insertTags(std::string_view input);
        void toggleTags(std::string_view input);
        void deleteTags(std::string_view input);
        void readTags();
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
        std::pair<std::string_view, SetEvaluation> search_(std::string_view input);
        unsigned short getBucketIndex(uint64_t item) const;
        const PairingBucket& getTagBucket(uint64_t tag) const;
        PairingBucket& getTagBucket(uint64_t tag);
        const PairingBucket& getFileBucket(uint64_t file) const;
        PairingBucket& getFileBucket(uint64_t file);

        void modifyFiles(std::string_view input, void (SingleBucket::*callback)(uint64_t));
        void modifyTags(std::string_view input, void (SingleBucket::*callback)(uint64_t));
        void modifyPairings(std::string_view input, void (PairingBucket::*callback)(std::pair<uint64_t, uint64_t>));

        const static int VERSION;

        bool closed_ = false;
        std::filesystem::path folderPath_;
        std::filesystem::path cacheFilePath_;
        unsigned short currentBucketCount = 16;
        std::vector<PairingBucket> tagFileBuckets;
        std::vector<PairingBucket> fileTagBuckets;
        std::unique_ptr<SingleBucket> fileBucket;
        std::unique_ptr<SingleBucket> tagBucket;
};