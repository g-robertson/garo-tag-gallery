#include "hash-comparer.hpp"
#include "hashes/my-shape-hash.hpp"
#include "../common/util.hpp"

#include <bit>
#include <ranges>
#include <cmath>
#include <iostream>

namespace {
    std::size_t hammingDistance(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b) {
        std::size_t distance = 0;
        if (a.size() != b.size()) {
            throw "Tried to compute hamming distance between two differently sized strings";
        }

        std::size_t i = 0;
        // TODO: This needs measured if it is making an impact
        for (; i + 8 < a.size(); i += 8) {
            distance += std::popcount((*reinterpret_cast<const uint64_t*>(a.data() + i)) ^ (*reinterpret_cast<const uint64_t*>(b.data() + i)));
        }

        for (; i < a.size(); ++i) {
            distance += std::popcount(static_cast<unsigned char>(a[i] ^ b[i]));
        }
    }

    struct ComparisonMade {
        unsigned int firstFile;
        unsigned int secondFile;
        unsigned int distance;
    };

    HashComparisonParams NO_PARAMS(std::string_view) {
        return HashComparisonParams {
            .deserializationLength = 0,
            .specificParams = nullptr
        };
    }
    HashComparisonParams UNIMPL_PARAMS(std::string_view) {
        throw "Hash comparison params have not been implemented for this algorithm";
    }

    unsigned int UNIMPL_HASH_COMPARE(const std::vector<unsigned char>&, const std::vector<unsigned char>&, const void*, unsigned int) {
        throw "Hash compare has not been implemented for this algorithm";
    }

    auto HASH_ALGORITHM_TO_HASH_COMPARISON_PARAMS_DESERIALIZER = std::unordered_map<Hasher::Algorithm, HashComparisonParams(*)(std::string_view)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, NO_PARAMS},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, NO_PARAMS},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_PHASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, NO_PARAMS},
        {Hasher::Algorithm::MY_SHAPE_HASH, MyShapeHash::deserializeComparisonParams}
    });
    
    auto HASH_ALGORITHM_TO_HASH_COMPARE = std::unordered_map<Hasher::Algorithm, unsigned int(*)(const std::vector<unsigned char>&, const std::vector<unsigned char>&, const void*, unsigned int)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::OCV_PHASH, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, UNIMPL_HASH_COMPARE},
        {Hasher::Algorithm::MY_SHAPE_HASH, MyShapeHash::hashCompare}
    });

};
    


HashComparer::HashComparer() {
    for (const auto& hashAlgorithmToCompare : HASH_ALGORITHM_TO_HASH_COMPARE) {
        comparedFileBuckets.insert({hashAlgorithmToCompare.first, {}});
    }
}

void HashComparer::setComparedFiles(std::string_view input) {
    auto hashAlgorithm = static_cast<Hasher::Algorithm>(input[0]);
    input = input.substr(1);
    auto& comparedFiles = comparedFileBuckets.at(hashAlgorithm);
    comparedFiles.clear();

    auto comparedFileCount = util::deserializeUInt32(input);
    input = input.substr(4);
    for (std::size_t i = 0; i < comparedFileCount; ++i) {
        auto comparedFile = util::deserializeUInt32(input);
        input = input.substr(4);
        comparedFiles.insert(comparedFile);
    }
}

void HashComparer::compareHashes(std::string_view input, void (*writer)(const std::string&), const Hasher& hasher) {
    auto hashAlgorithm = static_cast<Hasher::Algorithm>(input[0]);
    input = input.substr(1);
    if (!comparedFileBuckets.contains(hashAlgorithm)) {
        throw std::runtime_error(std::string("Compared file buckets did not have the algorithm \"") + static_cast<char>(hashAlgorithm) + "\" requested");
    }

    auto& comparedFiles = comparedFileBuckets.at(hashAlgorithm);
    auto hashCompare = HASH_ALGORITHM_TO_HASH_COMPARE.at(hashAlgorithm);

    unsigned int distanceCutoff = util::deserializeUInt32(input);
    input = input.substr(4);

    auto hashComparisonParams = HASH_ALGORITHM_TO_HASH_COMPARISON_PARAMS_DESERIALIZER.at(hashAlgorithm)(input);
    input = input.substr(hashComparisonParams.deserializationLength);

    const void* specificComparisonParams = hashComparisonParams.specificParams;
    const auto& toCompareHashes = hasher.getHashesForAlgorithm(hashAlgorithm);

    auto comparisonsMade = std::vector<ComparisonMade>();

    for (const auto& toCompareHash : toCompareHashes) {
        if (comparedFiles.contains(toCompareHash.first)) {
            continue;
        }

        for (auto comparedFile : comparedFiles) {
            const auto& comparedHash = toCompareHashes.at(comparedFile);

            auto distance = hashCompare(toCompareHash.second, comparedHash, specificComparisonParams, distanceCutoff);
            if (distance > distanceCutoff) {
                continue;
            }

            comparisonsMade.push_back(ComparisonMade {
                .firstFile = toCompareHash.first,
                .secondFile = comparedFile,
                .distance = distance
            });
        }

        comparedFiles.insert(toCompareHash.first);
    }

    std::sort(comparisonsMade.begin(), comparisonsMade.end(), [](const ComparisonMade& a, const ComparisonMade& b) {
        return a.distance < b.distance;
    });

    std::string output;
    std::size_t outputLocation = 0;
    output.reserve(comparisonsMade.size() * 12);
    for (const auto& comparisonMade : comparisonsMade) {
        util::serializeUInt32(comparisonMade.firstFile, output, outputLocation);
        outputLocation += 4;
        util::serializeUInt32(comparisonMade.secondFile, output, outputLocation);
        outputLocation += 4;
        util::serializeUInt32(comparisonMade.distance, output, outputLocation);
        outputLocation += 4;
    }

    writer(output);
}