#include "hash-comparer.hpp"
#include "hashes/ocv.hpp"
#include "../common/util.hpp"

#include <bit>
#include <ranges>
#include <cmath>
#include <iostream>


double CommonHashComparisons::hammingDistanceCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    unsigned int distance = 0;
    if (a.size() != b.size()) {
        throw std::logic_error("Tried to compute hamming distance between two differently sized strings");
    }
    
    for (std::size_t i = 0; i < a.size(); ++i) {
        distance += std::popcount(static_cast<unsigned char>(a[i] ^ b[i]));
        
    }
    return static_cast<double>(distance);
}

namespace {
    struct ComparisonMade {
        unsigned int firstFile;
        unsigned int secondFile;
        double distance;
    };

    void NO_PARAMS_DELETER(void*) {}
    void UNIMPL_PARAMS_DELETER(void*) {
        throw std::logic_error("Hash comparison params deleter has not been implemented for this algorithm");
    }
    void* NO_PARAMS(std::string_view, std::size_t&) {
        return nullptr;
    }
    void* UNIMPL_PARAMS(std::string_view, std::size_t&) {
        throw std::logic_error("Hash comparison params have not been implemented for this algorithm");
    }

    double UNIMPL_HASH_COMPARE(const std::vector<unsigned char>&, const std::vector<unsigned char>&, const void*, double) {
        throw std::logic_error("Hash compare has not been implemented for this algorithm");
    }

    auto HASH_ALGORITHM_TO_HASH_COMPARISON_PARAMS_DESERIALIZER = std::unordered_map<Hasher::Algorithm, void*(*)(std::string_view, std::size_t&)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, NO_PARAMS},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, NO_PARAMS},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_PHASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_SIFT_HASH, NO_PARAMS},
        {Hasher::Algorithm::EDGE_HASH, UNIMPL_PARAMS}
    });
    
    auto HASH_ALGORITHM_TO_HASH_COMPARISON_PARAMS_DELETER = std::unordered_map<Hasher::Algorithm, void(*)(void*)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_PHASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_SIFT_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::EDGE_HASH, UNIMPL_PARAMS_DELETER}
    });
    
    auto HASH_ALGORITHM_TO_HASH_COMPARE = std::unordered_map<Hasher::Algorithm, double(*)(const std::vector<unsigned char>&, const std::vector<unsigned char>&, const void*, double)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, OCVHashes::averageHashCompare},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, OCVHashes::blockMeanHashCompare},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, OCVHashes::blockMeanHashCompare},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, OCVHashes::colorMomentHashCompare},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, OCVHashes::marrHildrethHashCompare},
        {Hasher::Algorithm::OCV_PHASH, OCVHashes::pHashCompare},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, OCVHashes::radialVarianceHashCompare},
        {Hasher::Algorithm::OCV_SIFT_HASH, OCVHashes::siftCompare},
        {Hasher::Algorithm::EDGE_HASH, UNIMPL_HASH_COMPARE}
    });
};

HashComparer::HashComparer() {
    for (const auto& hashAlgorithmToCompare : HASH_ALGORITHM_TO_HASH_COMPARE) {
        comparedFileBuckets.insert({hashAlgorithmToCompare.first, {}});
    }
}

void HashComparer::setComparedFiles(std::string_view input) {
    std::size_t inputOffset = 0;

    auto hashAlgorithm = static_cast<Hasher::Algorithm>(util::deserializeChar(input, inputOffset));
    auto& comparedFiles = comparedFileBuckets.at(hashAlgorithm);
    comparedFiles.clear();

    auto comparedFileCount = util::deserializeUInt32(input, inputOffset);
    for (std::size_t i = 0; i < comparedFileCount; ++i) {
        auto comparedFile = util::deserializeUInt32(input, inputOffset);
        comparedFiles.insert(comparedFile);
    }
}

void HashComparer::compareHashes(std::string_view input, void (*writer)(const std::string&), const Hasher& hasher) {
    std::size_t inputOffset = 0;
    
    auto hashAlgorithm = static_cast<Hasher::Algorithm>(util::deserializeChar(input, inputOffset));
    if (!comparedFileBuckets.contains(hashAlgorithm)) {
        throw std::runtime_error(std::string("Compared file buckets did not have the algorithm \"") + static_cast<char>(hashAlgorithm) + "\" requested");
    }

    auto& comparedFiles = comparedFileBuckets.at(hashAlgorithm);
    auto hashCompare = HASH_ALGORITHM_TO_HASH_COMPARE.at(hashAlgorithm);

    double distanceCutoff = util::deserializeDouble(input, inputOffset);

    auto* genericHashComparisonParams = HASH_ALGORITHM_TO_HASH_COMPARISON_PARAMS_DESERIALIZER.at(hashAlgorithm)(input, inputOffset);

    const auto& toCompareHashes = hasher.getHashesForAlgorithm(hashAlgorithm);

    auto comparisonsMade = std::vector<ComparisonMade>();

    for (const auto& toCompareHash : toCompareHashes) {
        if (comparedFiles.contains(toCompareHash.first)) {
            continue;
        }

        for (auto comparedFile : comparedFiles) {
            const auto& comparedHash = toCompareHashes.at(comparedFile);

            auto distance = hashCompare(toCompareHash.second, comparedHash, genericHashComparisonParams, distanceCutoff);
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
    output.reserve(comparisonsMade.size() * 16);
    for (const auto& comparisonMade : comparisonsMade) {
        outputLocation = util::serializeUInt32(comparisonMade.firstFile, output, outputLocation);
        outputLocation = util::serializeUInt32(comparisonMade.secondFile, output, outputLocation);
        outputLocation = util::serializeDouble(comparisonMade.distance, output, outputLocation);
    }

    HASH_ALGORITHM_TO_HASH_COMPARISON_PARAMS_DELETER.at(hashAlgorithm)(genericHashComparisonParams);

    writer(output);
}