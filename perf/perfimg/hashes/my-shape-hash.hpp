#pragma once

#include <vector>
#include "../hash-comparer.hpp"
#include "../../extern/opencv-4.13.0/include/opencv2/opencv.hpp"
struct MyShapeHashComparisonParams {
    unsigned int missingEntryWeight;
    std::vector<std::array<unsigned int, 512>> ucharConstAddedDiffWeights;
    std::size_t totalWeightOctos;
};

namespace MyShapeHash {
    std::vector<unsigned char> hash(cv::Mat& image);
    HashComparisonParams deserializeComparisonParams(std::string_view input);
    unsigned int hashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, unsigned int distanceCutoff);
};