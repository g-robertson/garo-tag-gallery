#include "hasher.hpp"
#include "../common/util.hpp"
#include "hashes/ocv.hpp"

#include <string>
#include <iostream>


namespace {
    std::vector<unsigned char> UNIMPL_HASH(cv::Mat&) {
        throw "Hash is unimplemented";
    }

    auto HASH_ALGORITHM_TO_HASHER = std::unordered_map<Hasher::Algorithm, std::vector<unsigned char>(*)(cv::Mat&)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, OCVHashes::averageHash},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, OCVHashes::blockMeanHash0},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, OCVHashes::blockMeanHash1},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, OCVHashes::colorMomentHash},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, OCVHashes::marrHildrethHash},
        {Hasher::Algorithm::OCV_PHASH, OCVHashes::pHash},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, OCVHashes::radialVarianceHash},
        {Hasher::Algorithm::MY_SHAPE_HASH, UNIMPL_HASH}
    });
};

Hasher::Hasher() {
    for (const auto& hashAlgorithmToHasher : HASH_ALGORITHM_TO_HASHER) {
        computedPHashBuckets.insert({hashAlgorithmToHasher.first, {}});
    }
}

void Hasher::assignHashes(std::string_view input) {
    auto hashAlgorithm = static_cast<Hasher::Algorithm>(input[0]);
    input = input.substr(1);
    if (!computedPHashBuckets.contains(hashAlgorithm)) {
        throw std::runtime_error(std::string("Computed PHash buckets did not have the algorithm \"") + static_cast<char>(hashAlgorithm) + "\" requested");
    }

    auto& computedPHashes = computedPHashBuckets.at(hashAlgorithm);

    auto hashCount = util::deserializeUInt32(input);
    input = input.substr(4);

    for (std::size_t i = 0; i < hashCount; ++i) {
        auto fileNumber = util::deserializeUInt32(input);
        input = input.substr(4);
        auto hashLength = util::deserializeUInt32(input);
        input = input.substr(4);
        auto hash = util::deserializeUCharVector(input, hashLength);
        input = input.substr(hashLength);
        computedPHashes.insert({fileNumber, hash});
    }
}

void Hasher::performHashes(std::string_view input) {
    auto algorithm = static_cast<Hasher::Algorithm>(input[0]);
    input = input.substr(1);

    auto hasher = HASH_ALGORITHM_TO_HASHER.at(algorithm);
    auto& computedPHashes = computedPHashBuckets.at(algorithm);

    auto imagePathCount = util::deserializeUInt32(input);
    input = input.substr(4);

    for (std::size_t i = 0; i < imagePathCount; ++i) {
        auto fileNumber = util::deserializeUInt32(input);
        input = input.substr(4);
        auto pathLength = util::deserializeUInt32(input);
        input = input.substr(4);
        auto path = util::deserializeString(input, pathLength);
        input = input.substr(pathLength);
        auto image = cv::imread(path);
        auto hash = hasher(image);
        computedPHashes.insert({fileNumber, hash});
    }
}

const std::unordered_map<unsigned int, std::vector<unsigned char>>& Hasher::getHashesForAlgorithm(Algorithm algorithm) const {
    return computedPHashBuckets.at(algorithm);
}