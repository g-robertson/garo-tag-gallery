#pragma once

#include <vector>
#include "../../extern/opencv-4.13.0/include/opencv2/opencv.hpp"

namespace OCVHashes {
    std::vector<unsigned char> averageHash(cv::Mat& image, const void*);
    double averageHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double);
    std::vector<unsigned char> blockMeanHash0(cv::Mat& image, const void*);
    std::vector<unsigned char> blockMeanHash1(cv::Mat& image, const void*);
    double blockMeanHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double);
    std::vector<unsigned char> colorMomentHash(cv::Mat& image, const void*);
    double colorMomentHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double);
    std::vector<unsigned char> marrHildrethHash(cv::Mat& image, const void*);
    double marrHildrethHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double);
    std::vector<unsigned char> pHash(cv::Mat& image, const void*);
    double pHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double distanceCutoff);
    std::vector<unsigned char> radialVarianceHash(cv::Mat& image, const void*);
    double radialVarianceHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double);

    std::vector<unsigned char> siftHash(cv::Mat& image, const void*);
    double siftCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double);
};