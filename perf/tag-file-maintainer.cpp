#include "tag-file-maintainer.hpp"

#include <fstream>
#include <istream>
#include <algorithm>

#include "set-evaluation.hpp"
#include "atomic-ofstream.hpp"
#include "util.hpp"

const int TagFileMaintainer::VERSION = 1;

namespace {
    std::string serializePairings(const IdPairContainer& tagPairings) {
        std::string tagPairingsStr;
        std::size_t tagPairingsSize;

        tagPairingsStr.resize((8 * tagPairings.size()) + (16 * tagPairings.allContents().size()));
        std::size_t location = 0;
        for (auto tag : tagPairings.allContents()) {
            if (tag.second.size() == 0) {
                continue;
            }
            
            util::serializeUInt64(tag.first, tagPairingsStr, location);
            util::serializeUInt64(tag.second.size(), tagPairingsStr, location);
            for (auto file : tag.second) {
                util::serializeUInt64(file, tagPairingsStr, location);
            }
        }

        tagPairingsStr.resize(location);

        return tagPairingsStr;
    }

    std::string serializeFiles(const std::unordered_set<uint64_t>& contents) {
        std::string filesStr;

        filesStr.resize(8 * contents.size());
        std::size_t location = 0;
        for (auto file : contents) {
            util::serializeUInt64(file, filesStr, location);
        }

        return filesStr;
    }

    template <class T>
    void processFiles(std::string_view str, T callback) {
        if (str.size() % 8 != 0) {
            throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
        }
        while (str.size() > 0) {
            uint64_t file = util::deserializeUInt64(str);
            str = str.substr(8);
            callback(file);
        }
    }

    template <class T>
    void processPairings(std::string_view str, T callback) {
        if (str.size() % 8 != 0) {
            throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
        }
        while (str.size() > 0) {
            uint64_t first = util::deserializeUInt64(str);
            str = str.substr(8);
            uint64_t count = util::deserializeUInt64(str);
            str = str.substr(8);
            std::cout << '"' << first << '"'<< std::endl;
            for (std::size_t i = 0; i < count; ++i) {
                uint64_t second = util::deserializeUInt64(str);
                str = str.substr(8);
                callback(std::pair<uint64_t, uint64_t>(first, second));
            }
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
    int version;
    cacheFile >> version;
    cacheFile >> currentBucketCount;
    for (std::size_t i = 0; i < currentBucketCount; ++i) {
        std::size_t bucketTotalTagsToFiles;
        std::size_t bucketTotalFilesToTags;
        cacheFile >> bucketTotalTagsToFiles;
        cacheFile >> bucketTotalFilesToTags;

        std::string tagFileFolderName = std::string("tag-to-file-") + std::to_string(i);
        std::string fileTagFolderName = std::string("file-to-tag-") + std::to_string(i);
        tagFileBuckets.push_back(PairingBucket(folderPath_ / "buckets" / tagFileFolderName, bucketTotalTagsToFiles));
        fileTagBuckets.push_back(PairingBucket(folderPath_ / "buckets" / fileTagFolderName, bucketTotalFilesToTags));
    }

    std::size_t totalFiles;
    cacheFile >> totalFiles;

    fileBucket = std::make_unique<FileBucket>(folderPath_ / "buckets" / "file-bucket", totalFiles);
}

void TagFileMaintainer::writeCacheFile() {
    auto cacheFile = AtomicOfstream(cacheFilePath_);
    cacheFile << VERSION << ' ' << currentBucketCount;
    for (int i = 0; i < currentBucketCount; ++i) {
        cacheFile << ' ' << tagFileBuckets.at(i).size();
        cacheFile << ' ' << fileTagBuckets.at(i).size();
    }
    cacheFile << ' ' << fileBucket->size();
}

void TagFileMaintainer::modifyFiles(std::string_view input,  void (FileBucket::*callback)(uint64_t)) {
    auto modifyFile = [&callback, this](uint64_t file) {
        (*fileBucket.*callback)(file);
    };
    processFiles(input, modifyFile);
    fileBucket->toggleAhead();
    writeCacheFile();
}

void TagFileMaintainer::insertFiles(std::string_view input) {
    modifyFiles(input, FileBucket::insertItem);
}
void TagFileMaintainer::toggleFiles(std::string_view input) {
    modifyFiles(input, FileBucket::toggleItem);
}
void TagFileMaintainer::deleteFiles(std::string_view input) {
    modifyFiles(input, FileBucket::deleteItem);
}
void TagFileMaintainer::readFiles() {
    util::writeFile("perf-output.txt", serializeFiles(fileBucket->contents()));
}

void TagFileMaintainer::modifyPairings(std::string_view input, void (PairingBucket::*callback)(std::pair<uint64_t, uint64_t>)) {
    auto modifyPairing = [&callback, this](std::pair<uint64_t, uint64_t> item) {
        (getTagBucket(item.first).*callback)(std::pair<uint64_t, uint64_t>(item.first, item.second));
        (getFileBucket(item.second).*callback)(std::pair<uint64_t, uint64_t>(item.second, item.first));
    };
    processPairings(input, modifyPairing);

    for (auto& bucket : tagFileBuckets) {
        bucket.toggleAhead();
    }
    for (auto& bucket : fileTagBuckets) {
        bucket.toggleAhead();
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

void TagFileMaintainer::readFilesTags(std::string_view input) {
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
        if (fileTags != nullptr && fileTags->size() != 0) {
            util::serializeUInt64(file, output, location);
            util::serializeUInt64(fileTags->size(), output, location);
            
            for (auto tag : *fileTags) {
                util::serializeUInt64(tag, output, location);
            }
        }
    }

    util::writeFile("perf-output.txt", output);
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

void TagFileMaintainer::search(std::string_view input) {
    auto setEval = search_(input);
    auto files = setEval.second.releaseResult();
    util::writeFile("perf-output.txt", serializeFiles(files));
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
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(isComplement, universe, getTagBucket(tag).firstContents(tag)));
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
        } else if (input[0] == OPEN_GROUP) {
            input = input.substr(1);
            auto subSearch = search_(input);
            input = subSearch.first;
            context = SET_OPERATIONS.at(op)(std::move(context), std::move(subSearch.second));
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
    for (auto& bucket : tagFileBuckets) {
        bucket.close();
    }
    for (auto& bucket : fileTagBuckets) {
        bucket.close();
    }
    fileBucket->close();
    closed_ = true;
}

PairingBucket::PairingBucket(std::filesystem::path bucketPath, std::size_t size)
    : Bucket(bucketPath, size)
{}

const std::unordered_set<uint64_t>* PairingBucket::firstContents(uint64_t first) {
    init();

    return contents_.firstContents(first);
}

std::pair<uint64_t, uint64_t> PairingBucket::FAKER() {
    return {0xFFFFFFFFFFFFFFFF, 0xFFFFFFFFFFFFFFFF};
}

void PairingBucket::deserialize(std::string_view str, void(*callback)(Bucket<std::pair<uint64_t, uint64_t>, IdPairContainer>& bucket, std::pair<uint64_t, uint64_t> item)) {
    auto processor = [&callback, this](std::pair<uint64_t, uint64_t> item) {
        callback(*this, item);
    };
    processPairings(str, processor);
}
std::string PairingBucket::serialize(const IdPairContainer& contents) {
    return serializePairings(contents);
}


FileBucket::FileBucket(std::filesystem::path bucketPath, std::size_t startingSize)
    : Bucket(bucketPath, startingSize)
{}

uint64_t FileBucket::FAKER() {
    return 0xFFFFFFFFFFFFFFFF;
}

void FileBucket::deserialize(std::string_view str, void(*callback)(Bucket<uint64_t, std::unordered_set<uint64_t>>& bucket, uint64_t item)) {
    auto processor = [&callback, this](uint64_t item) {
        callback(*this, item);
    };
    processFiles(str, processor);
}

std::string FileBucket::serialize(const std::unordered_set<uint64_t>& contents) {
    return serializeFiles(contents);
}