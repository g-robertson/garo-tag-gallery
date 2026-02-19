#include "ocv-util.hpp"

#include "../common/util.hpp"

#include <numbers>
#include <iostream>

cv::Point2d OCVUtil::centerOfMass(const cv::Mat& inputImage) {
    std::size_t xTotal = 0.0;
    std::size_t yTotal = 0.0;
    std::size_t totalCountedPixels = 0;

    for (int y = 0; y < inputImage.rows; ++y) {
        for (int x = 0; x < inputImage.cols; ++x) {
            if (inputImage.at<uchar>(y,x) != 0) {
                xTotal += x;
                yTotal += y;
                ++totalCountedPixels;
            }
        }
    }

    return cv::Point2d(static_cast<double>(xTotal) / totalCountedPixels, static_cast<double>(yTotal) / totalCountedPixels);
}
cv::Point2d OCVUtil::center(double x, double y) {
    return cv::Point2d(x / 2, y / 2);

}
cv::Point2d OCVUtil::centerOfImage(const cv::Mat& inputImage) {
    return center(inputImage.cols - 1, inputImage.rows - 1);
}

double OCVUtil::getOrientation(const cv::Point2d& src, const cv::Point2d& dest) {
    if (dest == src) {
        return std::nan("");
    }

    return std::atan2(dest.y - src.y, dest.x - src.x) * 180 / std::numbers::pi;
}

cv::Mat OCVUtil::colorLabels(const cv::Mat& inputImage, const std::unordered_map<ushort, std::size_t>& importantLabels) {
    cv::Mat hueImage = cv::Mat::zeros(inputImage.rows, inputImage.cols, CV_8UC3);

    for (int y = 0; y < inputImage.rows; ++y) {
        for (int x = 0; x < inputImage.cols; ++x) {
            auto label = inputImage.at<ushort>(y, x);
            if (importantLabels.contains(label)) {
                hueImage.at<cv::Vec3b>(y, x)[0] = static_cast<uchar>(static_cast<double>(importantLabels.at(label)) * 180.0 / importantLabels.size());
            }
            hueImage.at<cv::Vec3b>(y, x)[1] = 255;
            hueImage.at<cv::Vec3b>(y, x)[2] = 255;
        }
    }


    cv::Mat coloredImage;
    cv::cvtColor(hueImage, coloredImage, cv::COLOR_HSV2BGR);
    for (int y = 0; y < inputImage.rows; ++y) {
        for (int x = 0; x < inputImage.cols; ++x) {
            if (inputImage.at<ushort>(y, x) == 0) {
                coloredImage.at<cv::Vec3b>(y, x)[0] = 0;
                coloredImage.at<cv::Vec3b>(y, x)[1] = 0;
                coloredImage.at<cv::Vec3b>(y, x)[2] = 0;
            } else if (!importantLabels.contains(inputImage.at<ushort>(y, x))) {
                coloredImage.at<cv::Vec3b>(y, x)[0] = 255;
                coloredImage.at<cv::Vec3b>(y, x)[1] = 255;
                coloredImage.at<cv::Vec3b>(y, x)[2] = 255;
            }
        }
    }

    return coloredImage;
}

cv::Mat OCVUtil::rotate(const cv::Mat& inputImage, double angle) {
    auto rotationMatrix = cv::getRotationMatrix2D(centerOfImage(inputImage), angle, 1.0);
    cv::Rect2f boundingBox = cv::RotatedRect(cv::Point2f(), inputImage.size(), angle).boundingRect2f();
    // adjust transformation matrix
    rotationMatrix.at<double>(0,2) += boundingBox.width/2.0 - inputImage.cols/2.0;
    rotationMatrix.at<double>(1,2) += boundingBox.height/2.0 - inputImage.rows/2.0;
    cv::Mat rotatedImage;

    cv::warpAffine(inputImage, rotatedImage, rotationMatrix, boundingBox.size());

    return rotatedImage;
}

std::size_t OCVUtil::serializeUCharDescriptors(const cv::Mat& descriptors, std::string& str, std::size_t location) {
    location = util::serializeUInt32(descriptors.rows, str, location);
    location = util::serializeUInt32(descriptors.cols, str, location);
    str.resize(location + descriptors.rows * descriptors.cols);
    for (int y = 0; y < descriptors.rows; ++y) {
        for (int x = 0; x < descriptors.cols; ++x) {
            location = util::serializeUChar(descriptors.at<uchar>(y, x), str, location);
        }
    }
    return location;
}
cv::Mat OCVUtil::deserializeUCharDescriptors(std::string_view str, std::size_t& inputOffset) {
    auto rows = util::deserializeUInt32(str, inputOffset);
    auto cols = util::deserializeUInt32(str, inputOffset);
    cv::Mat descriptors = cv::Mat::zeros(rows, cols, CV_8U);

    for (int y = 0; y < descriptors.rows; ++y) {
        for (int x = 0; x < descriptors.cols; ++x) {
            descriptors.at<uchar>(y, x) = util::deserializeUChar(str, inputOffset);
        }
    }

    return descriptors;
}

std::size_t OCVUtil::serializeFloatUCharDescriptors(const cv::Mat& descriptors, std::string& str, std::size_t location) {
    location = util::serializeUInt32(descriptors.rows, str, location);
    location = util::serializeUInt32(descriptors.cols, str, location);
    str.resize(location + descriptors.rows * descriptors.cols);
    for (int y = 0; y < descriptors.rows; ++y) {
        for (int x = 0; x < descriptors.cols; ++x) {
            float num = descriptors.at<float>(y, x);
            assert(static_cast<unsigned char>(num) == num);
            location = util::serializeUChar(static_cast<unsigned char>(descriptors.at<float>(y, x)), str, location);
        }
    }
    return location;
}
cv::Mat OCVUtil::deserializeFloatUCharDescriptors(std::string_view str, std::size_t& inputOffset) {
    auto rows = util::deserializeUInt32(str, inputOffset);
    auto cols = util::deserializeUInt32(str, inputOffset);
    cv::Mat descriptors = cv::Mat::zeros(rows, cols, CV_32F);

    for (int y = 0; y < descriptors.rows; ++y) {
        for (int x = 0; x < descriptors.cols; ++x) {
            descriptors.at<float>(y, x) = static_cast<float>(util::deserializeUChar(str, inputOffset));
        }
    }

    return descriptors;
}

std::size_t OCVUtil::serializeFloatDescriptors(const cv::Mat& descriptors, std::string& str, std::size_t location) {
    std::cerr << descriptors << std::endl;
    location = util::serializeUInt32(descriptors.rows, str, location);
    location = util::serializeUInt32(descriptors.cols, str, location);
    str.resize(location + descriptors.rows * descriptors.cols);
    for (int y = 0; y < descriptors.rows; ++y) {
        for (int x = 0; x < descriptors.cols; ++x) {
            location = util::serializeFloat(descriptors.at<float>(y, x), str, location);
        }
    }
    return location;
}
cv::Mat OCVUtil::deserializeFloatDescriptors(std::string_view str, std::size_t& inputOffset) {
    auto rows = util::deserializeUInt32(str, inputOffset);
    auto cols = util::deserializeUInt32(str, inputOffset);
    cv::Mat descriptors = cv::Mat::zeros(rows, cols, CV_32F);

    for (int y = 0; y < descriptors.rows; ++y) {
        for (int x = 0; x < descriptors.cols; ++x) {
            descriptors.at<float>(y, x) = static_cast<float>(util::deserializeFloat(str, inputOffset));
        }
    }

    return descriptors;
}