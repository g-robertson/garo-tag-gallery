#pragma once

#include "../extern/opencv-4.13.0/include/opencv2/opencv.hpp"

#include <unordered_map>

namespace OCVUtil {
    cv::Point2d centerOfMass(const cv::Mat& inputImage);

    cv::Point2d center(double x, double y);
    cv::Point2d centerOfImage(const cv::Mat& inputImage);

    double getOrientation(const cv::Point2d& src, const cv::Point2d& dest);

    cv::Mat colorLabels(const cv::Mat& inputImage, const std::unordered_map<ushort, std::size_t>& importantLabels);
    cv::Mat rotate(const cv::Mat& inputImage, double angle);

    //std::size_t serializeKeypoint(const cv::KeyPoint& keypoint, std::string& str, std::size_t location);
    //cv::KeyPoint deserializeKeypoint(std::string_view str, std::size_t& inputOffset);
    //std::size_t serializeKeypoints(const std::vector<cv::KeyPoint>& keypoints, std::string& str, std::size_t location);
    //std::vector<cv::KeyPoint> deserializeKeypoints(std::string_view str, std::size_t& inputOffset);

    std::size_t serializeUCharDescriptors(const cv::Mat& descriptors, std::string& str, std::size_t location);
    cv::Mat deserializeUCharDescriptors(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeFloatUCharDescriptors(const cv::Mat& descriptors, std::string& str, std::size_t location);
    cv::Mat deserializeFloatUCharDescriptors(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeFloatDescriptors(const cv::Mat& descriptors, std::string& str, std::size_t location);
    cv::Mat deserializeFloatDescriptors(std::string_view str, std::size_t& inputOffset);
};