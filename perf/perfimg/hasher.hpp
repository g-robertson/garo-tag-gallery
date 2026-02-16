#pragma once

#include <string_view>
#include <unordered_map>
#include <vector>

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
            MY_SHAPE_HASH = 'S'
        };
        void assignHashes(std::string_view input);
        void performHashes(std::string_view input);

        const std::unordered_map<unsigned int, std::vector<unsigned char>>& getHashesForAlgorithm(Algorithm algorithm) const;
    private:
        std::unordered_map<Algorithm, std::unordered_map<unsigned int, std::vector<unsigned char>>> computedPHashBuckets;
};