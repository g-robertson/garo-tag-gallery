#include "ocv.hpp"

std::vector<unsigned char> OCVHashes::averageHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::averageHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
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

std::vector<unsigned char> OCVHashes::colorMomentHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::colorMomentHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

std::vector<unsigned char> OCVHashes::marrHildrethHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::marrHildrethHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

std::vector<unsigned char> OCVHashes::pHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::pHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}

std::vector<unsigned char> OCVHashes::radialVarianceHash(cv::Mat& image) {
    cv::Mat hash;
    cv::img_hash::radialVarianceHash(image, hash);
    return std::vector<unsigned char>(const_cast<const uchar*>(hash.data), hash.dataend);
}