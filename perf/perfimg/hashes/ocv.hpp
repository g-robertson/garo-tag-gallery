#pragma once

#include <vector>
#include "../../extern/opencv-4.13.0/include/opencv2/opencv.hpp"

namespace OCVHashes {
    std::vector<unsigned char> averageHash(cv::Mat& image);
    std::vector<unsigned char> blockMeanHash0(cv::Mat& image);
    std::vector<unsigned char> blockMeanHash1(cv::Mat& image);
    std::vector<unsigned char> colorMomentHash(cv::Mat& image);
    std::vector<unsigned char> marrHildrethHash(cv::Mat& image);
    std::vector<unsigned char> pHash(cv::Mat& image);
    std::vector<unsigned char> radialVarianceHash(cv::Mat& image);
};