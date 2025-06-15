#include "tag-file-maintainer.hpp"

#include <fstream>
#include <istream>
#include <algorithm>

#include "atomic-ofstream.hpp"
#include "util.hpp"

const int TagFileMaintainer::VERSION = 1;

namespace {
    std::string serializeSingles(const std::unordered_set<uint64_t>& contents) {
        std::string filesStr;

        filesStr.resize(8 * contents.size());
        std::size_t location = 0;
        for (auto file : contents) {
            util::serializeUInt64(file, filesStr, location);
        }

        return filesStr;
    }

    template <class T>
    void processSingles(std::string_view str, T callback) {
        if (str.size() % 8 != 0) {
            throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
        }
        while (str.size() > 0) {
            uint64_t single = util::deserializeUInt64(str);
            str = str.substr(8);
            callback(single);
        }
    }
}

TagFileMaintainer::TagFileMaintainer(std::string folderName)
    : folderPath_(std::move(folderName))
{
    cacheFilePath_ = folderPath_ / "cache.tdb";
    readCacheFile();
}

TagFileMaintainer::~TagFileMaintainer() {
    if (!closed_) {
        close();
    }
}

void TagFileMaintainer::readCacheFile() {
    auto cacheFile = std::ifstream(cacheFilePath_);
    int version = VERSION;
    std::size_t totalFiles = 0;
    std::size_t totalTags = 0;

    std::string fillerNull;

    if (!cacheFile.fail()) {
        cacheFile >> version;
        cacheFile >> fillerNull;
        cacheFile >> totalFiles;
        cacheFile >> fillerNull;
        cacheFile >> totalTags;
        cacheFile >> fillerNull;
        cacheFile >> currentBucketCount;
    }

    taggableBucket = std::make_unique<SingleBucket>(folderPath_ / "buckets" / "taggable-bucket", totalFiles);
    tagBucket = std::make_unique<SingleBucket>(folderPath_ / "buckets" / "tag-bucket", totalTags);

    for (std::size_t i = 0; i < currentBucketCount; ++i) {
        std::size_t bucketTotalTagsToTaggables = 0;
        std::size_t bucketTagsToTaggablesComplementCount = 0;
        std::size_t bucketTotalTaggablesToTags = 0;
        std::size_t bucketTaggablesToTagsComplementCount = 0;
        if (!cacheFile.fail()) {
            cacheFile >> fillerNull;
            cacheFile >> bucketTotalTagsToTaggables;
            cacheFile >> fillerNull;
            cacheFile >> bucketTagsToTaggablesComplementCount;
            cacheFile >> fillerNull;
            cacheFile >> bucketTotalTaggablesToTags;
            cacheFile >> fillerNull;
            cacheFile >> bucketTaggablesToTagsComplementCount;
        }

        std::string tagTaggableFolderName = std::string("tag-to-taggable-") + std::to_string(i);
        std::string taggableTagFolderName = std::string("taggable-to-tag-") + std::to_string(i);
        tagTaggableBuckets.push_back(PairingBucket(folderPath_ / "buckets" / tagTaggableFolderName, bucketTotalTagsToTaggables, bucketTagsToTaggablesComplementCount, &taggableBucket->contents()));
        taggableTagBuckets.push_back(PairingBucket(folderPath_ / "buckets" / taggableTagFolderName, bucketTotalTaggablesToTags, bucketTaggablesToTagsComplementCount, &tagBucket->contents()));
    }
}

void TagFileMaintainer::writeCacheFile() {
    if (inTransaction) {
        return;
    }

    auto cacheFile = AtomicOfstream(cacheFilePath_);
    cacheFile << VERSION
              << " taggableBucketSize "
              << taggableBucket->size()
              << " tagBucketSize "
              << tagBucket->size()
              << " currentBucketCount "
              << currentBucketCount;
    
    for (int i = 0; i < currentBucketCount; ++i) {
        cacheFile << " tagTaggableBucket" << i << "Size "
                  << tagTaggableBuckets.at(i).size()
                  << " tagTaggableBucket" << i << "StartingComplementCount "
                  << tagTaggableBuckets.at(i).startingComplementCount()
                  << " taggableTagBucket" << i << "Size "
                  << taggableTagBuckets.at(i).size()
                  << " taggableTagBucket" << i << "StartingComplementCount "
                  << taggableTagBuckets.at(i).startingComplementCount();
    }
}

void TagFileMaintainer::insertTaggables(std::string_view input) {
    auto insertTaggable = [this](uint64_t taggable) {
        for (auto& bucket : tagTaggableBuckets) {
            bucket.insertComplement(taggable);
        }
        taggableBucket->insertItem(taggable);
    };
    processSingles(input, insertTaggable);

    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }

    taggableBucket->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::deleteTaggables(std::string_view input) {
    auto deleteTaggable = [this](uint64_t taggable) {
        auto& taggableTagBucket = getTaggableBucket(taggable);
        const auto* tags = taggableTagBucket.firstContents(taggable);
        std::vector<std::pair<uint64_t, uint64_t>> taggableTagsToErase;
        taggableTagsToErase.reserve(tags->size());

        auto insertPairingErasures = [this, &taggableTagsToErase, &taggable](uint64_t tag) {
            taggableTagsToErase.push_back({taggable, tag});
        };
        tags->forEach(insertPairingErasures);

        for (const auto& taggableTagToErase : taggableTagsToErase) {
            taggableTagBucket.deleteItem(taggableTagToErase);
            getTagBucket(taggableTagToErase.second).deleteItem({taggableTagToErase.second, taggableTagToErase.first});
        }

        taggableBucket->deleteItem(taggable);
    };
    
    processSingles(input, deleteTaggable);
    
    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }
    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }

    taggableBucket->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::readTaggables(void (*writer)(const std::string&)) {
    writer(serializeSingles(taggableBucket->contents()));
}

void TagFileMaintainer::insertTags(std::string_view input) {
    auto insertTag = [this](uint64_t tag) {
        for (auto& bucket : taggableTagBuckets) {
            bucket.insertComplement(tag);
        }
        tagBucket->insertItem(tag);
    };
    processSingles(input, insertTag);

    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }

    tagBucket->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::deleteTags(std::string_view input) {
    auto deleteTag = [this](uint64_t tag) {
        auto& tagTaggableBucket = getTagBucket(tag);
        const auto* taggables = tagTaggableBucket.firstContents(tag);
        std::vector<std::pair<uint64_t, uint64_t>> tagTaggablesToErase;
        tagTaggablesToErase.reserve(taggables->size());

        auto insertPairingErasures = [this, &tagTaggablesToErase, &tag](uint64_t taggable) {
            tagTaggablesToErase.push_back({tag, taggable});
        };
        taggables->forEach(insertPairingErasures);

        for (const auto& tagTaggableToErase : tagTaggablesToErase) {
            tagTaggableBucket.deleteItem(tagTaggableToErase);
            getTaggableBucket(tagTaggableToErase.second).deleteItem({tagTaggableToErase.second, tagTaggableToErase.first});
        }


        tagBucket->deleteItem(tag);
    };

    processSingles(input, deleteTag);
    
    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }
    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }

    tagBucket->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::readTags(void (*writer)(const std::string&)) {
    writer(serializeSingles(tagBucket->contents()));
}

#include <iostream>

void TagFileMaintainer::modifyPairings(std::string_view input, void (PairingBucket::*callback)(std::pair<uint64_t, uint64_t>)) {
    if (input.size() % 8 != 0) {
        throw std::logic_error("Pairing input was not a multiple of 8");
    }

    while (input.size() != 0) {
        auto tag = util::deserializeUInt64(input);
        input = input.substr(8);
        auto taggableCount = util::deserializeUInt64(input);
        input = input.substr(8);
        for (std::size_t i = 0; i < taggableCount; ++i) {
            auto taggable = util::deserializeUInt64(input);
            input = input.substr(8);
            (getTagBucket(tag).*callback)(std::pair<uint64_t, uint64_t>(tag, taggable));
            (getTaggableBucket(taggable).*callback)(std::pair<uint64_t, uint64_t>(taggable, tag));
        }
    }
    

    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }
    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }
    writeCacheFile();
}

void TagFileMaintainer::insertPairings(std::string_view input) {
    modifyPairings(input, &PairingBucket::insertItem);
}

void TagFileMaintainer::togglePairings(std::string_view input) {
    modifyPairings(input, &PairingBucket::toggleItem);
}

void TagFileMaintainer::deletePairings(std::string_view input) {
    modifyPairings(input, &PairingBucket::deleteItem);
}

void TagFileMaintainer::readTaggablesTags(std::string_view input, void (*writer)(const std::string&)) {
    std::string output;
    std::size_t location = 0;
    
    if (input.size() % 8 != 0) {
        throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
    }
    while (input.size() > 0) {
        uint64_t taggable = util::deserializeUInt64(input);
        input = input.substr(8);
        auto& taggableBucket = getTaggableBucket(taggable);
        const auto* taggableTags = taggableBucket.firstContents(taggable);
        if (taggableTags != nullptr) {
            util::serializeUInt64(taggable, output, location);
            util::serializeUInt64(taggableTags->size(), output, location);
            
            auto serializeTag = [&output, &location](uint64_t tag) {
                util::serializeUInt64(tag, output, location);
            };
            taggableTags->forEach(serializeTag);
        } else {
            util::serializeUInt64(taggable, output, location);
            util::serializeUInt64(0, output, location);
        }
    }

    writer(output);
}

// Searches tag file maintainer based on a search string where symbols mean the following:
// Operators are evaluated left to right in the shortest manner possible
// 'T' Tag: followed by a tag identifier will yield a taggable list of all taggables with that tag
// 'L' Taggable list: 
// '(' open group
// ')' close group
// '~' not
// '^' xor (symmetric difference)
// '-' difference
// '&' and (intersect)
// '|' or (union)

namespace {
    const char FIRST_OP = '\x00';
    const char TAG_TAGGABLE_LIST = 'T';
    const char TAGGABLE_LIST = 'L';
    const char OPEN_GROUP = '(';
    const char CLOSE_GROUP = ')';
    const char COMPLEMENT_OP = '~';
    const char RIGHT_HAND_SIDE_OP = '\xFF';
    const std::unordered_map<char, SetEvaluation(*)(SetEvaluation set1, SetEvaluation set2)> SET_OPERATIONS = {
        {'^', SetEvaluation::symmetricDifference},
        {'-', SetEvaluation::difference},
        {'&', SetEvaluation::intersect},
        {'|', SetEvaluation::setUnion},
        {RIGHT_HAND_SIDE_OP, SetEvaluation::rightHandSide}
    };
}

void TagFileMaintainer::search(std::string_view input, void (*writer)(const std::string&)) {
    auto setEval = search_(input);
    auto taggables = setEval.second.releaseResult();
    writer(serializeSingles(taggables));
}


std::pair<std::string_view, SetEvaluation> TagFileMaintainer::search_(std::string_view input) {
    static auto EMPTY_TAGGABLES = IdPairSecond(&taggableBucket->contents());
    const auto* universe = &taggableBucket->contents();
    auto context = SetEvaluation(false, universe, universe);
    char op = FIRST_OP;
    while (input.size() != 0) {
        if (op == FIRST_OP) {
            op = RIGHT_HAND_SIDE_OP;
        } else {
            op = input[0];
            input = input.substr(1);
        }

        if (op == CLOSE_GROUP) {
            return std::pair<std::string_view, SetEvaluation>(input, std::move(context));
        }

        bool isComplement = false;
        if (input[0] == COMPLEMENT_OP) {
            isComplement = true;
            input = input.substr(1);
        }

        if (input[0] == TAG_TAGGABLE_LIST) {
            input = input.substr(1);
            uint64_t tag = util::deserializeUInt64(input);
            input = input.substr(8);
            const auto* taggables = getTagBucket(tag).firstContents(tag);
            if (taggables == nullptr) {
                taggables = &EMPTY_TAGGABLES;
            }
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(taggables->isComplement() ^ isComplement, universe, &taggables->physicalContents()));
        } else if (input[0] == TAGGABLE_LIST) {
            input = input.substr(1);
            uint64_t taggableCount = util::deserializeUInt64(input);
            input = input.substr(8);
            std::unordered_set<uint64_t> taggables;
            for (std::size_t i = 0; i < taggableCount; ++i) {
                taggables.insert(util::deserializeUInt64(input));
                input = input.substr(8);
            }
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(isComplement, universe, std::move(taggables)));
        } else if (input[0] == OPEN_GROUP) {
            input = input.substr(1);
            auto subSearch = search_(input);
            input = subSearch.first;
            if (isComplement) {
                subSearch.second.complement();
            }
            context = SET_OPERATIONS.at(op)(std::move(context), std::move(subSearch.second));
        }
    }

    return std::pair<std::string_view, SetEvaluation>(input, std::move(context));
}

void TagFileMaintainer::flushFiles() {
    for (auto& tagTaggableBucket : tagTaggableBuckets) {
        tagTaggableBucket.write();
    }
    for (auto& taggableTagBucket : taggableTagBuckets) {
        taggableTagBucket.write();
    }
    taggableBucket->write();
    tagBucket->write();
}

void TagFileMaintainer::purgeUnusedFiles() const {
    for (const auto& tagTaggableBucket : tagTaggableBuckets) {
        tagTaggableBucket.purgeUnusedFiles();
    }
    for (const auto& taggableTagBucket : taggableTagBuckets) {
        taggableTagBucket.purgeUnusedFiles();
    }
    taggableBucket->purgeUnusedFiles();
    tagBucket->purgeUnusedFiles();
}

unsigned short TagFileMaintainer::getBucketIndex(uint64_t item) const {
    return static_cast<unsigned short>(item % currentBucketCount);
}

//uint32_t TagFileMaintainer::getWantedBucketCount() const {
//    return getWantedBucketSize();
//}
//
//uint32_t TagFileMaintainer::getWantedBucketSize() const {
//    auto writeBytesPerFile = (Config::getWriteBytesPerSecond() / Config::getWriteFileCountPerSecond()) / 2;
//    auto readBytesPerFile = (Config::getReadBytesPerSecond() / Config::getReadFileCountPerSecond()) / 2;
//    auto bucketBytesPerFileUnrounded = std::min(writeBytesPerFile, readBytesPerFile);
//    auto bucketBytesPerFile = 1;
//    while (bucketBytesPerFileUnrounded != 0) {
//        bucketBytesPerFileUnrounded >>= 1;
//        bucketBytesPerFile <<= 1;
//    }
//    return bucketBytesPerFile >> 1;
//}

PairingBucket& TagFileMaintainer::getTagBucket(uint64_t tag) {
    return tagTaggableBuckets.at(getBucketIndex(tag));
}
const PairingBucket& TagFileMaintainer::getTagBucket(uint64_t tag) const {
    return tagTaggableBuckets.at(getBucketIndex(tag));
}
PairingBucket& TagFileMaintainer::getTaggableBucket(uint64_t file) {
    return taggableTagBuckets.at(getBucketIndex(file));
}
const PairingBucket& TagFileMaintainer::getTaggableBucket(uint64_t file) const {
    return taggableTagBuckets.at(getBucketIndex(file));
}

void TagFileMaintainer::beginTransaction() {
    for (auto& tagTaggableBucket : tagTaggableBuckets) {
        tagTaggableBucket.beginTransaction();
    }
    for (auto& taggableTagBucket : taggableTagBuckets) {
        taggableTagBucket.beginTransaction();
    }
    taggableBucket->beginTransaction();
    tagBucket->beginTransaction();
    inTransaction = true;
}
void TagFileMaintainer::endTransaction() {
    for (auto& tagTaggableBucket : tagTaggableBuckets) {
        tagTaggableBucket.endTransaction();
    }
    for (auto& taggableTagBucket : taggableTagBuckets) {
        taggableTagBucket.endTransaction();
    }
    taggableBucket->endTransaction();
    tagBucket->endTransaction();
    inTransaction = false;
    writeCacheFile();
}

bool TagFileMaintainer::needsMaintenance() {
    return false;
}

void TagFileMaintainer::doMaintenance() {

}

void TagFileMaintainer::close() {
    if (closed_) {
        return;
    }
    
    for (auto& bucket : tagTaggableBuckets) {
        bucket.close();
    }
    for (auto& bucket : taggableTagBuckets) {
        bucket.close();
    }
    taggableBucket->close();
    tagBucket->close();
    writeCacheFile();
    closed_ = true;
}

PairingBucket::PairingBucket(std::filesystem::path bucketPath, std::size_t startingSize, std::size_t startingComplementCount, const std::unordered_set<uint64_t>* secondUniverse)
    : Bucket(bucketPath, startingSize), startingComplementCount_(startingComplementCount), secondUniverse(secondUniverse)
{
    contents_ = IdPairContainer(secondUniverse);
}

void PairingBucket::insertComplement(uint64_t second) {
    if (secondUniverse->contains(second)) {
        return;
    }
    if (startingComplementCount_ != 0) {
        diffContentsIsDirty = true;
        init();
    }

    // need to update only the diffs for those that start with complement
    for (auto first : startingFirstComplements) {
        diffContents.insert(std::pair<uint64_t, uint64_t>(first, second));
    }

    const auto& firstComplements = contents_.firstComplements();
    if (firstComplements.size() != 0) {
        contentsIsDirty = true;
    }
    contents_.insertComplement(second);
}
std::size_t PairingBucket::startingComplementCount() const {
    return startingComplementCount_;
}

const IdPairSecond* PairingBucket::firstContents(uint64_t first) {
    init();

    return contents_.firstContents(first);
}
std::pair<uint64_t, uint64_t> PairingBucket::FAKER() const {
    return {0xFFFFFFFFFFFFFFFF, 0xFFFFFFFFFFFFFFFF};
}

IdPairContainer PairingBucket::deserialize(std::string_view str) const  {
    return IdPairContainer::deserialize(str, secondUniverse);
}

IdPairDiffContainer PairingBucket::deserializeDiff(std::string_view str) const  {
    return IdPairDiffContainer::deserialize(str, secondUniverse);
}

std::string PairingBucket::serialize(const IdPairContainer& contents) const {
    return contents.serialize();
}

std::string PairingBucket::serializeDiff(const IdPairDiffContainer& diffContents) const {
    return diffContents.serialize();
}

bool PairingBucket::isErased(const IdPairInsertReturnType& eraseReturn) const {
    return eraseReturn.second;
}

void PairingBucket::applyDiff(const IdPairDiffContainer& diffContents) {
    for (const auto& pair : diffContents.allContents()) {
        auto first = pair.first;
        for (auto second : pair.second) {
            util::toggle(contents_, std::pair<uint64_t, uint64_t>(first, second));
        }
    }
}

void PairingBucket::postContentsMatchFile() {
    startingFirstComplements = contents_.firstComplements();
    startingComplementCount_ = startingFirstComplements.size();
}

SingleBucket::SingleBucket(std::filesystem::path bucketPath, std::size_t startingSize)
    : Bucket(bucketPath, startingSize)
{}

uint64_t SingleBucket::FAKER() const {
    return 0xFFFFFFFFFFFFFFFF;
}

std::unordered_set<uint64_t> SingleBucket::deserialize(std::string_view str) const {
    std::unordered_set<uint64_t> deserializedContents;
    auto processor = [this, &deserializedContents](uint64_t item) {
        deserializedContents.insert(item);
    };
    processSingles(str, processor);

    return deserializedContents;
}
std::unordered_set<uint64_t> SingleBucket::deserializeDiff(std::string_view str) const {
    return deserialize(str);
}

std::string SingleBucket::serialize(const std::unordered_set<uint64_t>& contents) const {
    return serializeSingles(contents);
}

std::string SingleBucket::serializeDiff(const std::unordered_set<uint64_t>& diffContents) const {
    return serialize(diffContents);
}

bool SingleBucket::isErased(const std::size_t& eraseReturn) const {
    return defaultIsErased(eraseReturn);
}
void SingleBucket::applyDiff(const std::unordered_set<uint64_t>& diffContents) {
    defaultApplyDiff(*this, diffContents);
}