#pragma once

#include <vector>
#include "../../extern/opencv-4.13.0/include/opencv2/opencv.hpp"

struct EdgeHashParams {
    double minEdgeThreshold;
    double maxEdgeThreshold;
    double edgeSizeThreshold;
};

namespace EdgeHash {
    extern std::string DEBUG_FILE_NAME; 

    std::vector<unsigned char> hash(cv::Mat& image, const void* hashParams);
    void* deserializeHashParams(std::string_view input, std::size_t& inputOffset);
    void deleteHashParams(void* genericParams);
};