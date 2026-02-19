#pragma once

#include <string_view>
#include <string>
#include <unordered_map>
#include <vector>

struct HashParams {
    std::size_t deserializationLength;
    void* specificParams;
};

class Hasher {
    public:
        Hasher();

        enum Algorithm : unsigned char  {
            OCV_AVERAGE_HASH = 'A',
            OCV_BLOCK_MEAN_HASH_0 = 'b',
            OCV_BLOCK_MEAN_HASH_1 = 'B',
            OCV_COLOR_MOMENT_HASH = 'C',
            OCV_MARR_HILDRETH_HASH = 'M',
            OCV_PHASH = 'P',
            OCV_RADIAL_VARIANCE_HASH = 'R',
            OCV_SIFT_HASH = 'S',
            EDGE_HASH = 'E'
        };
        void assignHashes(std::string_view input);
        std::vector<std::pair<unsigned int, const std::vector<unsigned char>*>> performHashes(std::string_view input);
        void performAndGetHashes(std::string_view input, void (*writer)(const std::string&));

        const std::unordered_map<unsigned int, std::vector<unsigned char>>& getHashesForAlgorithm(Algorithm algorithm) const;
    private:
        std::unordered_map<Algorithm, std::unordered_map<unsigned int, std::vector<unsigned char>>> computedPHashBuckets;
};