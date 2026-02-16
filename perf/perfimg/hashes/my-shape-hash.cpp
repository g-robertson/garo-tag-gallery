#include "my-shape-hash.hpp"

#include "../../common/util.hpp"
#include <iostream>

std::vector<unsigned char> MyShapeHash::hash(cv::Mat& image) {
    throw "This algorithm has not been implemented";
}

HashComparisonParams MyShapeHash::deserializeComparisonParams(std::string_view input) {
    auto* shapeHashParams = new MyShapeHashComparisonParams {
        .missingEntryWeight = 0,
        .ucharConstAddedDiffWeights = {}
    };
    HashComparisonParams genericParams = {
        .deserializationLength = 0,
        .specificParams = shapeHashParams
    };
    // get missing entry weight, mul'd by 100 to match mul/pow values, who have better reason for being mul'd
    shapeHashParams->missingEntryWeight = util::deserializeUInt32(input) * 100;
    input = input.substr(4);
    genericParams.deserializationLength += 4;

    // get mul/pow weights
    unsigned int weightCount = util::deserializeUInt32(input);
    input = input.substr(4);
    genericParams.deserializationLength += 4;
    for (std::size_t i = 0; i < weightCount; ++i) {
        unsigned int mulWeight = util::deserializeUInt32(input);
        input = input.substr(4);
        genericParams.deserializationLength += 4;
        int powHundredthWeight = util::deserializeUInt32(input);
        input = input.substr(4);
        genericParams.deserializationLength += 4;

        std::array<unsigned int, 512> ucharConstAddedDiffWeight;
        ucharConstAddedDiffWeight[WeightConstAdds::ABS] = 0;
        for (std::size_t j = 0; j < 256; ++j) {
            // mimicing abs, as well as combining all weights, multiply by 100 for additional precision on pow when converted to int
            auto weightedValue = static_cast<unsigned int>((100.f * mulWeight * std::powf(static_cast<float>(j), static_cast<float>(powHundredthWeight) / 100.f) - 0.5f));
            ucharConstAddedDiffWeight[WeightConstAdds::ABS - j] = weightedValue;
            ucharConstAddedDiffWeight[WeightConstAdds::ABS + j] = weightedValue;
        }
        shapeHashParams->ucharConstAddedDiffWeights.push_back(std::move(ucharConstAddedDiffWeight));
    }
    shapeHashParams->totalWeightOctos = (weightCount / 8) * 8;

    return genericParams;
}

unsigned int MyShapeHash::hashCompare(const std::vector<unsigned char>& aHash, const std::vector<unsigned char>& bHash, const void* specificParams, unsigned int distanceCutoff) {
    const auto* params = static_cast<const MyShapeHashComparisonParams*>(specificParams);

    auto totalWeightOctos = params->totalWeightOctos;
    auto ucharConstAddedDiffWeightsSize = params->ucharConstAddedDiffWeights.size();

    unsigned int distance = 0;
    std::size_t aHashPos = 0;
    std::size_t bHashPos = 0;
    while (aHashPos < aHash.size()) {
        unsigned char aHashEntrySize = aHash[aHashPos];
        ++aHashPos;
        unsigned char bHashEntrySize = bHash[bHashPos];
        ++bHashPos;
        if (aHashEntrySize == bHashEntrySize) {
            if (aHashEntrySize != 0) {
                std::size_t i = 0;
                for (; i < totalWeightOctos; i += 8) {
                    distance += params->ucharConstAddedDiffWeights[i + 0][static_cast<short>(aHash[aHashPos + i + 0]) - bHash[bHashPos + i + 0] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 1][static_cast<short>(aHash[aHashPos + i + 1]) - bHash[bHashPos + i + 1] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 2][static_cast<short>(aHash[aHashPos + i + 2]) - bHash[bHashPos + i + 2] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 3][static_cast<short>(aHash[aHashPos + i + 3]) - bHash[bHashPos + i + 3] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 4][static_cast<short>(aHash[aHashPos + i + 4]) - bHash[bHashPos + i + 4] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 5][static_cast<short>(aHash[aHashPos + i + 5]) - bHash[bHashPos + i + 5] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 6][static_cast<short>(aHash[aHashPos + i + 6]) - bHash[bHashPos + i + 6] + WeightConstAdds::ABS]
                              + params->ucharConstAddedDiffWeights[i + 7][static_cast<short>(aHash[aHashPos + i + 7]) - bHash[bHashPos + i + 7] + WeightConstAdds::ABS];
                }
                
                for (; i < ucharConstAddedDiffWeightsSize; ++i) {
                    distance += params->ucharConstAddedDiffWeights[i][static_cast<short>(aHash[aHashPos + i]) - bHash[bHashPos + i] + WeightConstAdds::ABS];
                }
            }
        } else {
            distance += params->missingEntryWeight;
        }

        if (distance > distanceCutoff) {
            break;
        }

        aHashPos += aHashEntrySize;
        bHashPos += bHashEntrySize;
    }

    return distance;
}