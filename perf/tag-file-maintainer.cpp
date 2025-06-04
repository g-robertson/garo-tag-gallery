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

    if (!cacheFile.fail()) {
        cacheFile >> version;
        cacheFile >> totalFiles;
        cacheFile >> totalTags;
        cacheFile >> currentBucketCount;
    }

    fileBucket = std::make_unique<SingleBucket>(folderPath_ / "buckets" / "file-bucket", totalFiles);
    tagBucket = std::make_unique<SingleBucket>(folderPath_ / "buckets" / "tag-bucket", totalTags);

    for (std::size_t i = 0; i < currentBucketCount; ++i) {
        std::size_t bucketTotalTagsToFiles = 0;
        std::size_t bucketTagsToFilesComplementCount = 0;
        std::size_t bucketTotalFilesToTags = 0;
        std::size_t bucketFilesToTagsComplementCount = 0;
        if (!cacheFile.fail()) {
            cacheFile >> bucketTotalTagsToFiles;
            cacheFile >> bucketTagsToFilesComplementCount;
            cacheFile >> bucketTotalFilesToTags;
            cacheFile >> bucketFilesToTagsComplementCount;
        }

        std::string tagFileFolderName = std::string("tag-to-file-") + std::to_string(i);
        std::string fileTagFolderName = std::string("file-to-tag-") + std::to_string(i);
        tagFileBuckets.push_back(PairingBucket(folderPath_ / "buckets" / tagFileFolderName, bucketTotalTagsToFiles, bucketTagsToFilesComplementCount, &fileBucket->contents()));
        fileTagBuckets.push_back(PairingBucket(folderPath_ / "buckets" / fileTagFolderName, bucketTotalFilesToTags, bucketFilesToTagsComplementCount, &tagBucket->contents()));
    }
}

void TagFileMaintainer::writeCacheFile() {
    auto cacheFile = AtomicOfstream(cacheFilePath_);
    cacheFile << VERSION
              << ' ' << fileBucket->size()
              << ' ' << tagBucket->size()
              << ' ' << currentBucketCount;
    
    for (int i = 0; i < currentBucketCount; ++i) {
        cacheFile << ' ' << tagFileBuckets.at(i).size()
                  << ' ' << tagFileBuckets.at(i).startingComplementCount()
                  << ' ' << fileTagBuckets.at(i).size()
                  << ' ' << fileTagBuckets.at(i).startingComplementCount();
    }
}

void TagFileMaintainer::modifyFiles(std::string_view input, void (SingleBucket::*callback)(uint64_t)) {
    auto modifyFile = [&callback, this](uint64_t file) {
        (*fileBucket.*callback)(file);
        for (auto& bucket : tagFileBuckets) {
            bucket.insertComplement(file);
        }
    };
    processSingles(input, modifyFile);

    for (auto& bucket : tagFileBuckets) {
        bucket.diffAhead();
    }

    fileBucket->diffAhead();
    writeCacheFile();
}

void TagFileMaintainer::insertFiles(std::string_view input) {
    modifyFiles(input, SingleBucket::insertItem);
}
void TagFileMaintainer::toggleFiles(std::string_view input) {
    modifyFiles(input, SingleBucket::toggleItem);
}
void TagFileMaintainer::deleteFiles(std::string_view input) {
    modifyFiles(input, SingleBucket::deleteItem);
}
void TagFileMaintainer::readFiles(void (*writer)(const std::string&)) {
    writer(serializeSingles(fileBucket->contents()));
}

void TagFileMaintainer::modifyTags(std::string_view input, void (SingleBucket::*callback)(uint64_t)) {
    auto modifyTag = [&callback, this](uint64_t tag) {
        (*tagBucket.*callback)(tag);
        for (auto& bucket : fileTagBuckets) {
            bucket.insertComplement(tag);
        }
    };
    processSingles(input, modifyTag);

    for (auto& bucket : fileTagBuckets) {
        bucket.diffAhead();
    }

    tagBucket->diffAhead();
    writeCacheFile();
}

void TagFileMaintainer::insertTags(std::string_view input) {
    modifyTags(input, SingleBucket::insertItem);
}
void TagFileMaintainer::toggleTags(std::string_view input) {
    modifyTags(input, SingleBucket::toggleItem);
}
void TagFileMaintainer::deleteTags(std::string_view input) {
    modifyTags(input, SingleBucket::deleteItem);
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
        auto fileCount = util::deserializeUInt64(input);
        input = input.substr(8);
        for (std::size_t i = 0; i < fileCount; ++i) {
            auto file = util::deserializeUInt64(input);
            input = input.substr(8);
            (getTagBucket(tag).*callback)(std::pair<uint64_t, uint64_t>(tag, file));
            (getFileBucket(file).*callback)(std::pair<uint64_t, uint64_t>(file, tag));
        }
    }
    

    for (auto& bucket : tagFileBuckets) {
        bucket.diffAhead();
    }
    for (auto& bucket : fileTagBuckets) {
        bucket.diffAhead();
    }
    writeCacheFile();
}

void TagFileMaintainer::insertPairings(std::string_view input) {
    modifyPairings(input, PairingBucket::insertItem);
}

void TagFileMaintainer::togglePairings(std::string_view input) {
    modifyPairings(input, PairingBucket::toggleItem);
}

void TagFileMaintainer::deletePairings(std::string_view input) {
    modifyPairings(input, PairingBucket::deleteItem);
}

void TagFileMaintainer::readFilesTags(std::string_view input, void (*writer)(const std::string&)) {
    std::string output;
    std::size_t location = 0;
    
    if (input.size() % 8 != 0) {
        throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
    }
    while (input.size() > 0) {
        uint64_t file = util::deserializeUInt64(input);
        input = input.substr(8);
        auto& fileBucket = getFileBucket(file);
        const auto* fileTags = fileBucket.firstContents(file);
        if (fileTags != nullptr) {
            util::serializeUInt64(file, output, location);
            util::serializeUInt64(fileTags->size(), output, location);
            
            auto serializeTag = [&output, &location](uint64_t tag) {
                util::serializeUInt64(tag, output, location);
            };
            fileTags->forEach(serializeTag);
        } else {
            util::serializeUInt64(file, output, location);
            util::serializeUInt64(0, output, location);
        }
    }

    writer(output);
}

// Searches tag file maintainer based on a search string where symbols mean the following:
// Operators are evaluated left to right in the shortest manner possible
// 'T' Tag: followed by a tag identifier will yield a file list of all files with that 
// 'F' Filelist: 
// '(' open group
// ')' close group
// '~' not
// '^' xor (symmetric difference)
// '-' difference
// '&' and (intersect)
// '|' or (union)

namespace {
    const char FIRST_OP = '\x00';
    const char TAG_FILE_LIST = 'T';
    const char FILE_LIST = 'F';
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
    auto files = setEval.second.releaseResult();

    writer(serializeSingles(files));
}

std::pair<std::string_view, SetEvaluation> TagFileMaintainer::search_(std::string_view input) {
    const auto* universe = &fileBucket->contents();
    auto context = SetEvaluation(false, universe, universe);
    char op = FIRST_OP;
    while (input.size() != 0) {
        if (op == FIRST_OP) {
            op = RIGHT_HAND_SIDE_OP;
        } else {
            op = input[0];
            input = input.substr(1);
        }

        bool isComplement = false;
        if (input[0] == COMPLEMENT_OP) {
            isComplement = true;
            input = input.substr(1);
        }

        if (input[0] == TAG_FILE_LIST) {
            input = input.substr(1);
            uint64_t tag = util::deserializeUInt64(input);
            input = input.substr(8);
            const auto* files = getTagBucket(tag).firstContents(tag);
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(files->isComplement(), universe, &files->physicalContents()));
        } else if (input[0] == FILE_LIST) {
            input = input.substr(1);
            uint64_t fileCount = util::deserializeUInt64(input);
            input = input.substr(8);
            std::unordered_set<uint64_t> files;
            for (std::size_t i = 0; i < fileCount; ++i) {
                files.insert(util::deserializeUInt64(input));
                input = input.substr(8);
            }
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(isComplement, universe, std::move(files)));
            if (isComplement) {
                context.complement();
            }
        } else if (input[0] == OPEN_GROUP) {
            input = input.substr(1);
            auto subSearch = search_(input);
            input = subSearch.first;
            context = SET_OPERATIONS.at(op)(std::move(context), std::move(subSearch.second));
            if (isComplement) {
                context.complement();
            }
        } else if (input[0] == CLOSE_GROUP) {
            input = input.substr(1);
            return std::pair<std::string_view, SetEvaluation>(input, std::move(context));
        }
    }

    return std::pair<std::string_view, SetEvaluation>(input, std::move(context));
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
    return tagFileBuckets.at(getBucketIndex(tag));
}
const PairingBucket& TagFileMaintainer::getTagBucket(uint64_t tag) const {
    return tagFileBuckets.at(getBucketIndex(tag));
}
PairingBucket& TagFileMaintainer::getFileBucket(uint64_t file) {
    return fileTagBuckets.at(getBucketIndex(file));
}
const PairingBucket& TagFileMaintainer::getFileBucket(uint64_t file) const {
    return fileTagBuckets.at(getBucketIndex(file));
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
    
    for (auto& bucket : tagFileBuckets) {
        bucket.close();
    }
    for (auto& bucket : fileTagBuckets) {
        bucket.close();
    }
    fileBucket->close();
    tagBucket->close();
    std::cerr << "everything closed!" << std::endl;
    closed_ = true;
}

PairingBucket::PairingBucket(std::filesystem::path bucketPath, std::size_t startingSize, std::size_t startingComplementCount, const std::unordered_set<uint64_t>* secondUniverse)
    : Bucket(bucketPath, startingSize), startingComplementCount_(startingComplementCount), secondUniverse(secondUniverse)
{
    contents_ = IdPairContainer(secondUniverse);
}

void PairingBucket::insertComplement(uint64_t second) {
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