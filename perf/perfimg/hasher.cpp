#include "hasher.hpp"
#include "../common/util.hpp"
#include "hashes/ocv.hpp"
#include "hashes/edge-hash.hpp"

#include <string>
#include <iostream>


namespace {
    void NO_PARAMS_DELETER(void*) {}
    void* NO_PARAMS(std::string_view, std::size_t&) {
        return nullptr;
    }
    std::vector<unsigned char> UNIMPL_HASH(cv::Mat&) {
        throw std::logic_error("Hash is unimplemented");
    }

    auto HASH_ALGORITHM_TO_HASH_PARAMS_DESERIALIZER = std::unordered_map<Hasher::Algorithm, void*(*)(std::string_view, std::size_t&)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, NO_PARAMS},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, NO_PARAMS},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_PHASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, NO_PARAMS},
        {Hasher::Algorithm::OCV_SIFT_HASH, NO_PARAMS},
        {Hasher::Algorithm::EDGE_HASH, EdgeHash::deserializeHashParams}
    });
    
    auto HASH_ALGORITHM_TO_HASH_PARAMS_DELETER = std::unordered_map<Hasher::Algorithm, void(*)(void*)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_PHASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::OCV_SIFT_HASH, NO_PARAMS_DELETER},
        {Hasher::Algorithm::EDGE_HASH, EdgeHash::deleteHashParams}
    });

    auto HASH_ALGORITHM_TO_HASHER = std::unordered_map<Hasher::Algorithm, std::vector<unsigned char>(*)(cv::Mat&, const void*)>({
        {Hasher::Algorithm::OCV_AVERAGE_HASH, OCVHashes::averageHash},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_0, OCVHashes::blockMeanHash0},
        {Hasher::Algorithm::OCV_BLOCK_MEAN_HASH_1, OCVHashes::blockMeanHash1},
        {Hasher::Algorithm::OCV_COLOR_MOMENT_HASH, OCVHashes::colorMomentHash},
        {Hasher::Algorithm::OCV_MARR_HILDRETH_HASH, OCVHashes::marrHildrethHash},
        {Hasher::Algorithm::OCV_PHASH, OCVHashes::pHash},
        {Hasher::Algorithm::OCV_RADIAL_VARIANCE_HASH, OCVHashes::radialVarianceHash},
        {Hasher::Algorithm::OCV_SIFT_HASH, OCVHashes::siftHash},
        {Hasher::Algorithm::EDGE_HASH, EdgeHash::hash}
    });
};

Hasher::Hasher() {
    for (const auto& hashAlgorithmToHasher : HASH_ALGORITHM_TO_HASHER) {
        computedPHashBuckets.insert({hashAlgorithmToHasher.first, {}});
    }
}

void Hasher::assignHashes(std::string_view input) {
    std::size_t inputOffset = 0;
    auto hashAlgorithm = static_cast<Hasher::Algorithm>(util::deserializeChar(input, inputOffset));
    if (!computedPHashBuckets.contains(hashAlgorithm)) {
        throw std::runtime_error(std::string("Computed PHash buckets did not have the algorithm \"") + static_cast<char>(hashAlgorithm) + "\" requested");
    }

    auto& computedPHashes = computedPHashBuckets.at(hashAlgorithm);

    auto hashCount = util::deserializeUInt32(input, inputOffset);
    for (std::size_t i = 0; i < hashCount; ++i) {
        auto fileNumber = util::deserializeUInt32(input, inputOffset);
        auto hash = util::deserializeUCharVector(input, inputOffset);
        computedPHashes.insert({fileNumber, hash});
    }
}

std::vector<std::pair<unsigned int, const std::vector<unsigned char>*>> Hasher::performHashes(std::string_view input) {
    std::size_t inputOffset = 0;
    std::vector<std::pair<unsigned int, const std::vector<unsigned char>*>> performedHashes; 

    auto algorithm = static_cast<Hasher::Algorithm>(util::deserializeChar(input, inputOffset));

    auto hasher = HASH_ALGORITHM_TO_HASHER.at(algorithm);
    auto* genericHashParams = HASH_ALGORITHM_TO_HASH_PARAMS_DESERIALIZER.at(algorithm)(input, inputOffset);
    auto& computedPHashes = computedPHashBuckets.at(algorithm);

    auto imagePathCount = util::deserializeUInt32(input, inputOffset);
    for (std::size_t i = 0; i < imagePathCount; ++i) {
        auto fileNumber = util::deserializeUInt32(input, inputOffset);
        auto path = util::deserializeString(input, inputOffset);
        auto image = cv::imread(path);

        auto hash = hasher(image, genericHashParams);
        auto it = computedPHashes.insert({fileNumber, hash});
        performedHashes.push_back({fileNumber, &it.first->second});
    }

    HASH_ALGORITHM_TO_HASH_PARAMS_DELETER.at(algorithm)(genericHashParams);

    return performedHashes;
}

void Hasher::performAndGetHashes(std::string_view input, void (*writer)(const std::string&)) {
    std::string output;
    std::size_t outputLocation = 0;

    auto performedHashes = performHashes(input);
    for (const auto& fileHashPair : performedHashes) {
        outputLocation = util::serializeUInt32(fileHashPair.first, output, outputLocation);
        outputLocation = util::serializeUCharSpan(*fileHashPair.second, output, outputLocation);
    }

    writer(output);
}

const std::unordered_map<unsigned int, std::vector<unsigned char>>& Hasher::getHashesForAlgorithm(Algorithm algorithm) const {
    return computedPHashBuckets.at(algorithm);
}