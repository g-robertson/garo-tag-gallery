#include "edge-hash.hpp"
#include "../../common/util.hpp"
#include "../ocv-util.hpp"

#include <iostream>

std::string EdgeHash::DEBUG_FILE_NAME {};

struct EdgeLabelArea {
    ushort label;
    int area;
};

void generateDebugImage(const cv::Mat& connectedEdges, const std::vector<unsigned short>& edgeLabels, double normalizationAngle) {
    std::unordered_map<ushort, std::size_t> importantLabels;
    for (std::size_t i = 0; i < edgeLabels.size(); ++i) {
        importantLabels.insert({edgeLabels[i], 1});
    }

    auto coloredEdges = OCVUtil::colorLabels(connectedEdges, importantLabels);
    //auto rotationNormalizedEdges = OCVUtil::rotate(coloredEdges, normalizationAngle);
    std::cerr << EdgeHash::DEBUG_FILE_NAME << std::endl;
    cv::imwrite(EdgeHash::DEBUG_FILE_NAME, coloredEdges);
}

std::vector<unsigned char> EdgeHash::hash(cv::Mat& image, const void* genericParams) {
    const EdgeHashParams* hashParams = static_cast<const EdgeHashParams*>(genericParams);
    auto edgeSizeThreshold = image.rows * image.cols * hashParams->edgeSizeThreshold;

    cv::Mat edgeImage;
    cv::Canny(image, edgeImage, hashParams->minEdgeThreshold, hashParams->maxEdgeThreshold, 3, true);
    auto edgeImageCenter = OCVUtil::centerOfImage(edgeImage);
    cv::Mat connectedEdges;
    cv::Mat connectedEdgesStats;
    cv::Mat connectedEdgesCentroids;
    auto labelCount = static_cast<unsigned short>(cv::connectedComponentsWithStats(edgeImage, connectedEdges, connectedEdgesStats, connectedEdgesCentroids, 8, CV_16U));
    
    std::vector<unsigned short> edgeLabels;
    const unsigned short FIRST_NON_BG_LABEL = 1;
    for (unsigned short label = FIRST_NON_BG_LABEL; label < labelCount; ++label) {
        auto area = connectedEdgesStats.at<int>(label, cv::ConnectedComponentsTypes::CC_STAT_AREA);
        if (area < edgeSizeThreshold) {
            continue;
        }
        edgeLabels.push_back(label);
    }

    // happy case: take rotation angle of whole image
    auto normalizationAngle = OCVUtil::getOrientation(edgeImageCenter, OCVUtil::centerOfMass(edgeImage));

    // happy case: take mirror as 
    generateDebugImage(connectedEdges, edgeLabels, normalizationAngle);

    std::cout << "done" << std::endl;
    return std::vector<unsigned char>();
}

void* EdgeHash::deserializeHashParams(std::string_view input, std::size_t& inputOffset) {
    auto minEdgeThreshold = util::deserializeDouble(input, inputOffset);
    auto maxEdgeThreshold = util::deserializeDouble(input, inputOffset);
    auto edgeSizeThreshold = util::deserializeDouble(input, inputOffset);

    return new EdgeHashParams {
        .minEdgeThreshold = minEdgeThreshold,
        .maxEdgeThreshold = maxEdgeThreshold,
        .edgeSizeThreshold = edgeSizeThreshold
    };
}

void EdgeHash::deleteHashParams(void* genericParams) {
    EdgeHashParams* hashParams = static_cast<EdgeHashParams*>(genericParams);
    delete hashParams;
}