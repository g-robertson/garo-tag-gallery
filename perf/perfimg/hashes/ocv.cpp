#include "ocv.hpp"

#include "../ocv-util.hpp"
#include "../../common/util.hpp"
#include "../hash-comparer.hpp"

#include <iostream>

namespace {
    static auto AVERAGE_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto BLOCK_MEAN_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto COLOR_MOMENT_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto MARR_HILDRETH_HASH_OBJ = cv::img_hash::AverageHash::create();
    static auto RADIAL_VARIANCE_HASH_OBJ = cv::img_hash::AverageHash::create();

    static auto BF_MATCHER_L2 = cv::BFMatcher::create(cv::NORM_L2);
    static auto BF_MATCHER_HAMMING = cv::BFMatcher::create(cv::NORM_HAMMING);
    static auto KDTREE_INDEX_PARAMS = cv::makePtr<cv::flann::KDTreeIndexParams>();
    static auto FLANN_MATCHER_NORM_L2 = cv::FlannBasedMatcher(KDTREE_INDEX_PARAMS);
    static auto WEAK_SIFT_OBJ = cv::SIFT::create(200);
}

std::vector<unsigned char> OCVHashes::averageHash(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::averageHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

double OCVHashes::averageHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    return AVERAGE_HASH_OBJ->compare(a, b);
}
std::vector<unsigned char> OCVHashes::blockMeanHash0(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::blockMeanHash(image, hash, cv::img_hash::BLOCK_MEAN_HASH_MODE_0);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

std::vector<unsigned char> OCVHashes::blockMeanHash1(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::blockMeanHash(image, hash, cv::img_hash::BLOCK_MEAN_HASH_MODE_1);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::blockMeanHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    return BLOCK_MEAN_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::colorMomentHash(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::colorMomentHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::colorMomentHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    return COLOR_MOMENT_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::marrHildrethHash(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::marrHildrethHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::marrHildrethHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    return MARR_HILDRETH_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::pHash(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::pHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::pHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double distanceCutoff) {
    return CommonHashComparisons::hammingDistanceCompare(a, b, nullptr, distanceCutoff);
}

std::vector<unsigned char> OCVHashes::radialVarianceHash(cv::Mat& image, const void*) {
    cv::Mat hash;
    cv::img_hash::radialVarianceHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}
double OCVHashes::radialVarianceHashCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    return RADIAL_VARIANCE_HASH_OBJ->compare(a, b);
}

std::vector<unsigned char> OCVHashes::siftHash(cv::Mat& image, const void*) {
    std::vector<cv::KeyPoint> keypoints;
    cv::Mat descriptors;
    WEAK_SIFT_OBJ->detectAndCompute(image, cv::noArray(), keypoints, descriptors);
    
    std::size_t hashLocation = 0;
    std::string hash;
    hashLocation = OCVUtil::serializeFloatUCharDescriptors(descriptors, hash, hashLocation);

    return util::strToUCharVector(hash);
}
double OCVHashes::siftCompare(const std::vector<unsigned char>& a, const std::vector<unsigned char>& b, const void*, double) {
    auto aSV = util::ucharVectorToStringView(a);
    auto bSV = util::ucharVectorToStringView(b);
    std::size_t aInputOffset = 0;
    std::size_t bInputOffset = 0;

    auto aDescriptors = OCVUtil::deserializeFloatUCharDescriptors(aSV, aInputOffset);
    auto bDescriptors = OCVUtil::deserializeFloatUCharDescriptors(bSV, bInputOffset);

    std::vector<std::vector<cv::DMatch>> matchess;
    BF_MATCHER_L2->knnMatch(aDescriptors, bDescriptors, matchess, 2);
    double badMatches = 0;
    for (const auto& matches : matchess) {
        if (matches[0].distance > 0.7 * matches[1].distance) {
            ++badMatches;
        }
    }
    
    return badMatches / matchess.size();
}