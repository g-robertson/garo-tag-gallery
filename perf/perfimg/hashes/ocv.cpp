#include "ocv.hpp"

#include "../hash-comparer.hpp"

namespace {
    static auto AVERAGE_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto BLOCK_MEAN_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto COLOR_MOMENT_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto MARR_HILDRETH_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto RADIAL_VARIANCE_HASH_OBJ = cv::img_hash::AverageHash::create();
}

std::vector<unsigned char> OCVHashes::averageHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::averageHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

double OCVHashes::averageHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, double distanceCutoff) {
    return AVERAGE_HASH_OBJ->compare(a, b);
}
std::vector<unsigned char> OCVHashes::blockMeanHash0(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::blockMeanHash(image, hash, cv::img_hash::BLOCK_MEAN_HASH_MODE_0);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

std::vector<unsigned char> OCVHashes::blockMeanHash1(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::blockMeanHash(image, hash, cv::img_hash::BLOCK_MEAN_HASH_MODE_1);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::blockMeanHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, double distanceCutoff) {
    return BLOCK_MEAN_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::colorMomentHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::colorMomentHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::colorMomentHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, double distanceCutoff) {
    return COLOR_MOMENT_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::marrHildrethHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::marrHildrethHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::marrHildrethHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, double distanceCutoff) {
    return MARR_HILDRETH_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::pHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::pHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::pHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, double distanceCutoff) {
    return CommonHashComparisons::hammingDistanceCompare(a, b, specificParams, distanceCutoff);
}

std::vector<unsigned char> OCVHashes::radialVarianceHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::radialVarianceHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::radialVarianceHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void* specificParams, double distanceCutoff) {
    return RADIAL_VARIANCE_HASH_OBJ->compare(a, b);
}