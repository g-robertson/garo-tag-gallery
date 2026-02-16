#pragma once

#include <string_view>
#include <unordered_set>
#include <string>

#include "hasher.hpp"

namespace WeightConstAdds {
    const unsigned char ABS = 255;
};

struct HashComparisonParams {
    std::size_t deserializationLength;
    void* specificParams;
};

class HashComparer {
    public:
        HashComparer();
        void setComparedFiles(std::string_view input);
        void compareHashes(std::string_view input, void (*writer)(const std::string&), const Hasher& hasher);
    private:
        std::unordered_map<Hasher::Algorithm, std::unordered_set<unsigned int>> comparedFileBuckets;
};