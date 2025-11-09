#include "test-tag-file-maintainer.hpp"

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

TestTagFileMaintainer::TestTagFileMaintainer(std::string folderName)
    : TagFileMaintainer(std::move(folderName))
{}

void TestTagFileMaintainer::insertTags(std::string_view input) {
    TagFileMaintainer* self = this;
    if (overrideMode == "fail_tags_insert_between_pairings_and_singles_writes") {
        insertTagsFailBetweenPairingsAndSinglesWrites(input);
    } else {
        self->insertTags(input);
    }
}
void TestTagFileMaintainer::insertTagsFailBetweenPairingsAndSinglesWrites(std::string_view input) {
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

    throw std::logic_error("COMPLETELY STAGED ERROR");

    tagBucket_->diffAhead();
    writeCacheFile();
}