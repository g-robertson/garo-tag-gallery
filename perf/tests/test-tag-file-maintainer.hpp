#pragma once
#include "../tag-file-maintainer.hpp"

class TestTagFileMaintainer : public TagFileMaintainer {
    public:
        TestTagFileMaintainer(std::string folderName);

        std::string overrideMode = "";
        void insertTags(std::string_view input);
        void insertTagsFailBetweenPairingsAndSinglesWrites(std::string_view input);
};