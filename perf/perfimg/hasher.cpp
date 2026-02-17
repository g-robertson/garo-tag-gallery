#include "hasher.hpp"
#include "../common/util.hpp"
#include "hashes/ocv.hpp"

#include <string>
#include <iostream>


namespace {
    std::vector<unsigned char> UNIMPL_HASH(cv::Mat&) {
        throw std::logic_error("Hash is unimplemented");
    }

    auto HASH_ALGORITHM_TO_HASHER = std::unordered_map<Hasher::Algorithm, std::vector<unsigned char>(*)(cv::Mat&)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, OCVHashes::averageHash},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, OCVHashes::blockMeanHash0},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, OCVHashes::blockMeanHash1},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, OCVHashes::colorMomentHash},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, OCVHashes::marrHildrethHash},
        {Hasher::Algorithm::OCV_PHASH, OCVHashes::pHash},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, OCVHashes::radialVarianceHash}
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

std::vector<std::pair<unsigned int, const std::vector<unsigned char>*>> Hasher::performHashes(std::string_view input) {
    std::vector<std::pair<unsigned int, const std::vector<unsigned char>*>> performedHashes; 

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
        auto it = computedPHashes.insert({fileNumber, hash});
        performedHashes.push_back({fileNumber, &it.first->second});
    }

    return performedHashes;
}

void Hasher::performAndGetHashes(std::string_view input, void (*writer)(const std::string&)) {
    std::string output;
    std::size_t outputLocation = 0;

    auto performedHashes = performHashes(input);
    for (const auto& fileHashPair : performedHashes) {
        outputLocation = util::serializeUInt32(fileHashPair.first, output, outputLocation);
        outputLocation = util::serializeUInt32(fileHashPair.second->size(), output, outputLocation);
        outputLocation = util::serializeUCharVector(*fileHashPair.second, output, outputLocation);
    }

    writer(output);
}

const std::unordered_map<unsigned int, std::vector<unsigned char>>& Hasher::getHashesForAlgorithm(Algorithm algorithm) const {
    return computedPHashBuckets.at(algorithm);
}