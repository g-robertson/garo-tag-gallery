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
            location = util::serializeUInt64(file, filesStr, location);
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

    taggableBucket_ = std::make_unique<SingleBucket>(folderPath_ / "buckets" / "taggable-bucket", totalFiles);
    tagBucket_ = std::make_unique<SingleBucket>(folderPath_ / "buckets" / "tag-bucket", totalTags);

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
        tagTaggableBuckets.push_back(PairingBucket(folderPath_ / "buckets" / tagTaggableFolderName, bucketTotalTagsToTaggables, bucketTagsToTaggablesComplementCount, &taggableBucket_->contents()));
        taggableTagBuckets.push_back(PairingBucket(folderPath_ / "buckets" / taggableTagFolderName, bucketTotalTaggablesToTags, bucketTaggablesToTagsComplementCount, &tagBucket_->contents()));
    }

    if (!cacheFile.fail()) {
        cacheFile.close();
        priorCacheFile = util::readFile(cacheFilePath_);
    } else {
        flushFiles();
    }
}

void TagFileMaintainer::writePriorCacheFile() {
    if (inTransaction) {
        return;
    }

    util::writeFile(cacheFilePath_, priorCacheFile);
}

void TagFileMaintainer::writeCacheFile() {
    if (inTransaction) {
        return;
    }

    auto cacheFile = AtomicOfstream(cacheFilePath_);
    cacheFile << VERSION
              << " taggableBucketSize "
              << taggableBucket_->size()
              << " tagBucketSize "
              << tagBucket_->size()
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
        taggableBucket_->insertItem(taggable);
    };
    processSingles(input, insertTaggable);

    writePriorCacheFile();

    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }

    taggableBucket_->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::deleteTaggables(std::string_view input) {
    auto deleteTaggable = [this](uint64_t taggable) {
        if (!taggableBucket_->contains(taggable)) {
            return;
        }

        auto& taggableTagBucket = getTaggableBucket(taggable);
        const auto* tags = taggableTagBucket.firstContents(taggable);
        if (tags != nullptr) {
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
        }

        taggableBucket_->deleteItem(taggable);
        for (auto& bucket : tagTaggableBuckets) {
            bucket.deleteComplement(taggable);
        }
    };
    
    processSingles(input, deleteTaggable);
    
    writePriorCacheFile();

    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }
    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }

    taggableBucket_->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::readTaggables(void (*writer)(const std::string&)) {
    writer(serializeSingles(taggableBucket_->contents()));
}

void TagFileMaintainer::insertTags(std::string_view input) {
    auto insertTag = [this](uint64_t tag) {
        for (auto& bucket : taggableTagBuckets) {
            bucket.insertComplement(tag);
        }
        tagBucket_->insertItem(tag);
    };
    processSingles(input, insertTag);

    writePriorCacheFile();

    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }

    tagBucket_->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::deleteTags(std::string_view input) {
    auto deleteTag = [this](uint64_t tag) {
        if (!tagBucket_->contains(tag)) {
            return;
        }

        auto& tagTaggableBucket = getTagBucket(tag);
        const auto* taggables = tagTaggableBucket.firstContents(tag);

        if (taggables != nullptr) {
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
        }


        tagBucket_->deleteItem(tag);
        for (auto& bucket : taggableTagBuckets) {
            bucket.deleteComplement(tag);
        }
    };

    processSingles(input, deleteTag);
    
    writePriorCacheFile();

    for (auto& bucket : taggableTagBuckets) {
        bucket.diffAhead();
    }
    for (auto& bucket : tagTaggableBuckets) {
        bucket.diffAhead();
    }

    tagBucket_->diffAhead();
    writeCacheFile();
}
void TagFileMaintainer::readTags(void (*writer)(const std::string&)) {
    writer(serializeSingles(tagBucket_->contents()));
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
    
    writePriorCacheFile();

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

void TagFileMaintainer::readTagGroupsTaggableCountsWithSearch(std::string_view input, void (*writer)(const std::string&)) {
    uint64_t tagGroupCount = util::deserializeUInt64(input);
    input = input.substr(8);
    std::vector<uint64_t> tagGroupsTaggableCounts;
    tagGroupsTaggableCounts.resize(tagGroupCount, 0);
    std::unordered_map<uint64_t, std::vector<std::size_t>> tagToTagGroupIndices;
    tagToTagGroupIndices.reserve(tagGroupCount);

    for (std::size_t i = 0; i < tagGroupCount; ++i) {
        auto tagCount = util::deserializeUInt64(input);
        input = input.substr(8);

        for (std::size_t j = 0; j < tagCount; ++j) {
            auto tag = util::deserializeUInt64(input);
            input = input.substr(8);
            auto tagGroupIndices = tagToTagGroupIndices.find(tag);
            if (tagGroupIndices == tagToTagGroupIndices.end()) {
                tagGroupIndices = tagToTagGroupIndices.insert({tag, std::vector<std::size_t>()}).first;
            }
            tagGroupIndices->second.push_back(i);
        }
    }

    auto search = search_(input);
    auto result = search.second.releaseResult();

    std::unordered_set<std::size_t> tagGroupIndicesToAddTo;
    auto gatherTagGroupIndices = [&tagToTagGroupIndices, &tagGroupIndicesToAddTo](uint64_t tag) {
        if (tagToTagGroupIndices.contains(tag)) {
            for (auto index : tagToTagGroupIndices.at(tag)) {
                tagGroupIndicesToAddTo.insert(index);
            }
        }
    };
    for (auto taggable : result) {
        auto& taggableBucket = getTaggableBucket(taggable);
        const auto* taggablesTags = taggableBucket.firstContents(taggable);
        if (taggablesTags != nullptr) {
            taggablesTags->forEach(gatherTagGroupIndices);
        }

        for (auto index : tagGroupIndicesToAddTo) {
            ++tagGroupsTaggableCounts[index];
        }
        tagGroupIndicesToAddTo.clear();
    }

    std::string output;
    std::size_t location = 0;
    for (const auto& tagGroupTaggableCount : tagGroupsTaggableCounts) {
        location = util::serializeUInt64(tagGroupTaggableCount, output, location);
    }

    writer(output);
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
            location = util::serializeUInt64(taggable, output, location);
            location = util::serializeUInt64(taggableTags->size(), output, location);
            
            auto serializeTag = [&output, &location](uint64_t tag) {
                location = util::serializeUInt64(tag, output, location);
            };
            taggableTags->forEach(serializeTag);
        } else {
            location = util::serializeUInt64(taggable, output, location);
            location = util::serializeUInt64(0, output, location);
        }
    }

    writer(output);
}

// format is {tags count}{tags}{taggables count}{taggables}
void TagFileMaintainer::readTaggablesSpecifiedTags(std::string_view input, void (*writer)(const std::string&)) {
    std::string output;
    std::size_t location = 0;
    
    if (input.size() % 8 != 0) {
        throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
    }
    uint64_t tagCount = util::deserializeUInt64(input);
    input = input.substr(8);
    std::unordered_set<uint64_t> tagsSpecified;
    tagsSpecified.reserve(tagCount);
    for (std::size_t i = 0; i < tagCount; ++i) {
        uint64_t tag = util::deserializeUInt64(input);
        input = input.substr(8);
        tagsSpecified.insert(tag);
    }

    uint64_t taggableCount = util::deserializeUInt64(input);
    std::vector<uint64_t> tagsToWrite;
    for (std::size_t i = 0; i < taggableCount; ++i) {
        uint64_t taggable = util::deserializeUInt64(input);
        input = input.substr(8);
        auto& taggableBucket = getTaggableBucket(taggable);
        const auto* taggableTags = taggableBucket.firstContents(taggable);
        if (taggableTags != nullptr) {
            location = util::serializeUInt64(taggable, output, location);
            
            std::size_t tagsWritten = 0;
            std::size_t tagsCountLocation = location;
            const uint64_t PLACEHOLDER_COUNT = 0xFFFFFFFFFFFFFFFFULL;
            location = util::serializeUInt64(PLACEHOLDER_COUNT, output, location);

            auto serializeTag = [&output, &location, &tagsSpecified, &tagsWritten](uint64_t tag) {
                if (tagsSpecified.contains(tag)) {
                    location = util::serializeUInt64(tag, output, location);
                    ++tagsWritten;
                }
            };
            taggableTags->forEach(serializeTag);

            util::serializeUInt64(tagsWritten, output, tagsCountLocation);
        } else {
            location = util::serializeUInt64(taggable, output, location);
            location = util::serializeUInt64(0, output, location);
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
    const char AGGREGATE_TAGS = 'A';
    const char EMPTY_SET = 'E';
    const char UNIVERSE_SET = 'U';
    const char TAG_TAGGABLE_LIST = 'T';
    const char TAGGABLE_LIST = 'L';
    const char OPEN_GROUP = '(';
    const char CLOSE_GROUP = ')';
    const char COUNT_OP = 'C';
    const char PERCENTAGE_OP = 'P';
    const char FILTERED_PERCENTAGE_OP = 'F';
    const char COMPLEMENT_OP = '~';
    const char RIGHT_HAND_SIDE_OP = '\xFF';
    const std::unordered_map<char, SetEvaluation(*)(SetEvaluation&& set1, SetEvaluation set2)> SET_OPERATIONS = {
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

namespace {
    struct PreemptiveComparison {
        bool isPossible;
        bool comparison;
    };

    template <class T>
    PreemptiveComparison tryPreemptiveCompare(T lhs, std::string_view comparator, T rhs) {
        if (comparator == "< ") {
            return PreemptiveComparison {
                .isPossible = lhs < rhs,
                .comparison = true
            };
        } else if (comparator == "<=") {
            return PreemptiveComparison {
                .isPossible = lhs <= rhs,
                .comparison = true
            };
        } else if (comparator == "> ") {
            return PreemptiveComparison {
                .isPossible = lhs <= rhs,
                .comparison = false
            };
        } else if (comparator == ">=") {
            return PreemptiveComparison {
                .isPossible = lhs < rhs,
                .comparison = false
            };
        } else {
            throw std::logic_error(std::string("Invalid comparator '" + std::string(comparator) + "' was provided to preemptive compare"));
        }
    }

    template <class T>
    bool compare(T lhs, std::string_view comparator, T rhs) {
        if (comparator == "< ") {
            return lhs < rhs;
        } else if (comparator == "<=") {
            return lhs <= rhs;
        } else if (comparator == "> ") {
            return lhs > rhs;
        } else if (comparator == ">=") {
            return lhs >= rhs;
        } else {
            throw std::logic_error(std::string("Invalid comparator '" + std::string(comparator) + "' was provided to compare"));
        }
    }
}

std::pair<std::string_view, SetEvaluation> TagFileMaintainer::search_(std::string_view input) {
    static auto EMPTY_TAGGABLES = IdPairSecond(&taggableBucket_->contents());
    const auto* universe = &taggableBucket_->contents();
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
            auto tag = util::deserializeUInt64(input);
            input = input.substr(8);
            const auto* taggables = getTagBucket(tag).firstContents(tag);
            if (taggables == nullptr) {
                taggables = &EMPTY_TAGGABLES;
            }
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(taggables->isComplement() ^ isComplement, universe, &taggables->physicalContents()));
        } else if (input[0] == TAGGABLE_LIST) {
            input = input.substr(1);
            auto taggableCount = util::deserializeUInt64(input);
            input = input.substr(8);
            std::unordered_set<uint64_t> taggables;
            for (std::size_t i = 0; i < taggableCount; ++i) {
                taggables.insert(util::deserializeUInt64(input));
                input = input.substr(8);
            }
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(isComplement, universe, std::move(taggables)));
        } else if (input[0] == AGGREGATE_TAGS) {
            input = input.substr(1);
            // Aggregate Operations looks like A{tag count}{tags}{many conditions})
            char aggregateOp = 0;
            auto tagCount = util::deserializeUInt64(input);
            input = input.substr(8);
            std::unordered_set<uint64_t> aggregateTags;
            for (std::size_t i = 0; i < tagCount; ++i) {
                aggregateTags.insert(util::deserializeUInt64(input));
                input = input.substr(8);
            }

            while (input.size() != 0 && aggregateOp != CLOSE_GROUP) {
                aggregateOp = input[0];
                input = input.substr(1);

                if (aggregateOp == COUNT_OP) {
                    // Count Operation looks like C{comparator}{occurrences}{expression})
                    // Restricts {tags} to where the tag is represented with {comparator} {occurrences} within {expression}
                    std::string_view comparator = input.substr(0, 2);
                    input = input.substr(2);
                    auto occurrences = util::deserializeUInt64(input);
                    input = input.substr(8);
                    
                    auto representationContext = search_(input);
                    input = representationContext.first;
                    const auto& immutableRepresentationContext = representationContext.second;

                    std::vector<uint64_t> tagsToRemove;
                    for (auto tag : aggregateTags) {
                        const auto* taggables = getTagBucket(tag).firstContents(tag);
                        if (taggables == nullptr) {
                            taggables = &EMPTY_TAGGABLES;
                        }
                        auto preemptiveComparison = tryPreemptiveCompare(taggables->size(), comparator, occurrences);
                        if (preemptiveComparison.isPossible) {
                            if (!preemptiveComparison.comparison) {
                                tagsToRemove.push_back(tag);
                            }
                            continue;
                        } else {
                            auto tagsRepresentation = SetEvaluation::intersect(immutableRepresentationContext, SetEvaluation(taggables->isComplement(), universe, &taggables->physicalContents()));
                            if (!compare(tagsRepresentation.size(), comparator, occurrences)) {
                                tagsToRemove.push_back(tag);
                            }
                        }
                    }
                    for (auto tag : tagsToRemove) {
                        aggregateTags.erase(tag);
                    }
                } else if (aggregateOp == PERCENTAGE_OP) {
                    // Percentage Operation looks like {LHS}P{comparator}{percentage}{expression})
                    // Restricts {tags} to where the tag is represented with {comparator} {percentage} within {LHS}
                    std::string_view comparator = input.substr(0, 2);
                    input = input.substr(2);
                    auto percentage = util::deserializeFloat(input);
                    input = input.substr(4);
                    
                    auto representationContext = search_(input);
                    input = representationContext.first;
                    const auto& immutableRepresentationContext = representationContext.second;

                    std::vector<uint64_t> tagsToRemove;
                    for (auto tag : aggregateTags) {
                        const auto* taggables = getTagBucket(tag).firstContents(tag);
                        if (taggables == nullptr) {
                            taggables = &EMPTY_TAGGABLES;
                        }
                    
                        auto tagsRepresentation = SetEvaluation::intersect(immutableRepresentationContext, SetEvaluation(taggables->isComplement(), universe, &taggables->physicalContents()));
                        if (!compare(static_cast<float>(tagsRepresentation.size()) / static_cast<float>(taggables->size()), comparator, percentage)) {
                            tagsToRemove.push_back(tag);
                        }
                    }
                    for (auto tag : tagsToRemove) {
                        aggregateTags.erase(tag);
                    }
                } else if (aggregateOp == FILTERED_PERCENTAGE_OP) {
                    // Count Operation looks like P{comparator}{percentage}{filteringExpression}){expression})
                    // Gets a union of all {tags} where the tag's taggables that are filtered by {LHS} are represented with {comparator} {percentage} within {expression}
                    std::string_view comparator = input.substr(0, 2);
                    input = input.substr(2);
                    auto percentage = util::deserializeFloat(input);
                    input = input.substr(4);
                
                    auto filteringContext = search_(input);
                    input = filteringContext.first;
                    const auto& immutableFilteringContext = filteringContext.second;
                
                    auto representationContext = search_(input);
                    input = representationContext.first;
                    const auto& immutableRepresentationContext = representationContext.second;
                
                    std::vector<uint64_t> tagsToRemove;
                    for (auto tag : aggregateTags) {
                        const auto* taggables = getTagBucket(tag).firstContents(tag);
                        if (taggables == nullptr) {
                            taggables = &EMPTY_TAGGABLES;
                        }
                    
                        auto filteredTaggables = SetEvaluation::intersect(immutableFilteringContext, SetEvaluation(taggables->isComplement(), universe, &taggables->physicalContents()));
                        auto filteredTaggableCount = filteredTaggables.size();
                        auto tagsRepresentation = SetEvaluation::intersect(immutableRepresentationContext, std::move(filteredTaggables));
                        if (!compare(static_cast<float>(tagsRepresentation.size()) / static_cast<float>(filteredTaggableCount), comparator, percentage)) {
                            tagsToRemove.push_back(tag);    
                        }
                    }
                    for (auto tag : tagsToRemove) {
                        aggregateTags.erase(tag);
                    }
                }
                
            }

            auto unionAggregateTags = SetEvaluation(isComplement, universe, std::unordered_set<uint64_t>());
            for (auto tag : aggregateTags) {
                const auto* taggables = getTagBucket(tag).firstContents(tag);
                if (taggables == nullptr) {
                    taggables = &EMPTY_TAGGABLES;
                }
                unionAggregateTags = SetEvaluation::setUnion(std::move(unionAggregateTags), SetEvaluation(taggables->isComplement(), universe, &taggables->physicalContents()));
            }

            context = SET_OPERATIONS.at(op)(std::move(context), std::move(unionAggregateTags));
        } else if (input[0] == OPEN_GROUP) {
            input = input.substr(1);
            auto subSearch = search_(input);
            input = subSearch.first;
            if (isComplement) {
                subSearch.second.complement();
            }
            context = SET_OPERATIONS.at(op)(std::move(context), std::move(subSearch.second));
        } else if (input[0] == UNIVERSE_SET) {
            input = input.substr(1);
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(isComplement, universe, universe));
        } else if (input[0] == EMPTY_SET) {
            input = input.substr(1);
            context = SET_OPERATIONS.at(op)(std::move(context), SetEvaluation(isComplement, universe, &EMPTY_TAGGABLES.physicalContents()));
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
    taggableBucket_->write();
    tagBucket_->write();
    writeCacheFile();
    priorCacheFile = util::readFile(cacheFilePath_);
}

void TagFileMaintainer::purgeUnusedFiles() const {
    for (const auto& tagTaggableBucket : tagTaggableBuckets) {
        tagTaggableBucket.purgeUnusedFiles();
    }
    for (const auto& taggableTagBucket : taggableTagBuckets) {
        taggableTagBucket.purgeUnusedFiles();
    }
    taggableBucket_->purgeUnusedFiles();
    tagBucket_->purgeUnusedFiles();
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
    taggableBucket_->beginTransaction();
    tagBucket_->beginTransaction();
    inTransaction = true;
}
void TagFileMaintainer::endTransaction() {
    writePriorCacheFile();

    for (auto& tagTaggableBucket : tagTaggableBuckets) {
        tagTaggableBucket.endTransaction();
    }
    for (auto& taggableTagBucket : taggableTagBuckets) {
        taggableTagBucket.endTransaction();
    }
    taggableBucket_->endTransaction();
    tagBucket_->endTransaction();
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
    
    flushFiles();

    closed_ = true;
}

PairingBucket::PairingBucket(std::filesystem::path bucketPath, std::size_t startingSize, std::size_t startingComplementCount, const std::unordered_set<uint64_t>* secondUniverse)
    : Bucket(bucketPath, startingSize), startingComplementCount_(startingComplementCount), secondUniverse_(secondUniverse)
{
    contents_ = IdPairContainer(secondUniverse);
}

void PairingBucket::insertComplement(uint64_t second) {
    if (secondUniverse_->contains(second)) {
        return;
    }
    if (startingComplementCount_ != 0) {
        diffContentsIsDirty_ = true;
        init();
    }

    // need to update only the diffs for those that start with complement
    for (auto first : startingFirstComplements) {
        diffContents_.insert(std::pair<uint64_t, uint64_t>(first, second));
    }

    const auto& firstComplements = contents_.firstComplements();
    if (firstComplements.size() != 0) {
        contentsIsDirty = true;
    }
    contents_.insertComplement(second);
}

void PairingBucket::deleteComplement(uint64_t second) {
    if (secondUniverse_->contains(second)) {
        throw "Second universe contains item we are deleting complement of";
    }
    if (startingComplementCount_ != 0) {
        diffContentsIsDirty_ = true;
        init();
    }

    // need to update only the diffs for those that start with complement
    for (auto first : startingFirstComplements) {
        util::toggle(diffContents_, std::pair<uint64_t, uint64_t>(first, second));
    }

    const auto& firstComplements = contents_.firstComplements();
    if (firstComplements.size() != 0) {
        contentsIsDirty = true;
    }
    contents_.deleteComplement(second);

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
    return IdPairContainer::deserialize(str, secondUniverse_);
}

IdPairDiffContainer PairingBucket::deserializeDiff(std::string_view str) const  {
    return IdPairDiffContainer::deserialize(str, secondUniverse_);
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