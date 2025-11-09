#include <string>
#include <fstream>
#include <sstream>
#include <vector>
#include <string_view>
#include <ranges>
#include <filesystem>
#include <cmath>
#include <iostream>

struct ComparisonMade {
    unsigned int firstHashIndex;
    unsigned int secondHashIndex;
    unsigned int distance;
};

std::size_t serializeUInt32(const uint32_t& i, std::string& str, std::size_t location) {
    if (location + 4 > str.size()) {
        str.resize(location + 4);
    }

    str[location] =     std::bit_cast<char>(static_cast<unsigned char>((i >> 24ULL) & 0xFFUL));
    str[location + 1] = std::bit_cast<char>(static_cast<unsigned char>((i >> 16ULL) & 0xFFUL));
    str[location + 2] = std::bit_cast<char>(static_cast<unsigned char>((i >>  8ULL) & 0xFFUL));
    str[location + 3] = std::bit_cast<char>(static_cast<unsigned char>((i         ) & 0xFFUL));

    return location + 4;
}

const uint8_t DESERIALIZE_FLOAT_INDEX_0 = (std::endian::native == std::endian::little) ? 0 : 3;
const uint8_t DESERIALIZE_FLOAT_INDEX_1 = (std::endian::native == std::endian::little) ? 1 : 2;
const uint8_t DESERIALIZE_FLOAT_INDEX_2 = (std::endian::native == std::endian::little) ? 2 : 1;
const uint8_t DESERIALIZE_FLOAT_INDEX_3 = (std::endian::native == std::endian::little) ? 3 : 0;

uint32_t deserializeUInt32(std::string_view str) {
    uint32_t i = (
        (static_cast<uint32_t>(std::bit_cast<unsigned char>(str[0])) << 24ULL) |
        (static_cast<uint32_t>(std::bit_cast<unsigned char>(str[1])) << 16ULL) |
        (static_cast<uint32_t>(std::bit_cast<unsigned char>(str[2])) <<  8ULL) |
        (static_cast<uint32_t>(std::bit_cast<unsigned char>(str[3]))         )
    );

    return i;
}


void writeFile(const std::filesystem::path& filePath, std::string_view data) {
    std::filesystem::path absoluteFilePath = std::filesystem::absolute(filePath);
    std::filesystem::path unfinishedFilePath = absoluteFilePath;
    unfinishedFilePath += ".unf";
    if (std::filesystem::exists(unfinishedFilePath)) {
        throw std::logic_error(std::string("Unfinished file path ") + unfinishedFilePath.generic_string() + "existed for file " + filePath.generic_string());
    }

    std::filesystem::create_directories(absoluteFilePath.parent_path());

    std::ofstream file;
    file.open(unfinishedFilePath, std::ios::out | std::ios::binary);
    file.write(data.data(), data.size());
    file.close();

    for (int i = 0; i < 10; ++i) {
        bool caught = false;
        try {
            std::filesystem::rename(unfinishedFilePath, absoluteFilePath);
        } catch (...) {
            caught = true;
        }
        if (!caught) {
            break;
        } else {
            std::cerr << "Caught filesystem exception while renaming " + unfinishedFilePath.generic_string() << " retrying attempt #" + std::to_string(i) << std::endl;
        }
    }
}

const int ABS_OFFSET = 255;

int main(int argc, const char** argv) {
    std::string writeInputFileName = "hash-write-input.txt";
    std::string writeOutputFileName = "hash-write-output.txt";
    if (argc > 1) {
        writeInputFileName = argv[1];
    }
    if (argc > 2) {
        writeOutputFileName = argv[2];
    }

    std::vector<std::vector<unsigned char>> alreadyComparedHashes;

    std::string op;
    while (op != "exit") {
        bool badCommand = false;
        std::getline(std::cin, op);


        std::ifstream file(writeInputFileName, std::ios::in | std::ios::binary);
        std::stringstream buffer;
        buffer << file.rdbuf();
        std::string input = buffer.str();
        auto inputSV = std::string_view(input);

        if (op == "set_already_compared") {
            alreadyComparedHashes.clear();
            auto alreadyComparedHashCount = deserializeUInt32(inputSV);
            inputSV = inputSV.substr(4);
            for (std::size_t i = 0; i < alreadyComparedHashCount; ++i) {
                auto alreadyComparedHashLength = deserializeUInt32(inputSV);
                inputSV = inputSV.substr(4);
                alreadyComparedHashes.push_back(std::vector<unsigned char>(inputSV.begin(), inputSV.begin() + alreadyComparedHashLength));
                inputSV = inputSV.substr(alreadyComparedHashLength);
            }
        } else if (op == "compare_hashes") {
            std::vector<std::span<const unsigned char>> toCompareHashes;
            std::vector<std::array<unsigned int, 512>> totalWeights;
            unsigned int distanceCutoff = 0;
            distanceCutoff = deserializeUInt32(inputSV);
            inputSV = inputSV.substr(4);

            unsigned int missingEntryWeight = 0;

            // get missing entry weight
            missingEntryWeight = 100 * deserializeUInt32(inputSV);
            inputSV = inputSV.substr(4);
            {
                std::vector<unsigned int> mulWeights;
                // get mul/pow weights
                unsigned int weightCount = deserializeUInt32(inputSV);
                inputSV = inputSV.substr(4);
                for (unsigned int i = 0; i < weightCount; ++i) {
                    mulWeights.push_back(deserializeUInt32(inputSV));
                    inputSV = inputSV.substr(4);
                }

                for (unsigned int i = 0; i < weightCount; ++i) {
                    int powHundredthWeight = deserializeUInt32(inputSV);
                    inputSV = inputSV.substr(4);
                    std::array<unsigned int, 512> totalWeights_;
                    for (std::size_t j = 0; j < 256; ++j) {
                        // mimicing abs, as well as combining all weights, multiply by 10000 for additional precision on pow when converted to int
                        auto weightedValue = static_cast<unsigned int>((mulWeights[i] * 100.f * std::powf(static_cast<float>(j), static_cast<float>(powHundredthWeight) / 100.f) - 0.5f));
                        totalWeights_[ABS_OFFSET - j] = weightedValue;
                        totalWeights_[ABS_OFFSET + j] = weightedValue;
                    }
                    totalWeights.push_back(std::move(totalWeights_));
                }
            }
        
            auto toCompareHashCount = deserializeUInt32(inputSV);
            inputSV = inputSV.substr(4);
            for (std::size_t i = 0; i < toCompareHashCount; ++i) {
                auto toCompareHashLength = deserializeUInt32(inputSV);
                inputSV = inputSV.substr(4);
                toCompareHashes.push_back(std::span<const unsigned char>(reinterpret_cast<const unsigned char*>(inputSV.data()), toCompareHashLength));
                inputSV = inputSV.substr(toCompareHashLength);
            }

            auto comparisonsMade = std::vector<ComparisonMade>();

            std::size_t totalWeightOctos = (totalWeights.size() / 8) * 8;

            for (std::size_t i = 0; i < toCompareHashes.size(); ++i) {
                std::span<const unsigned char> toCompareHash = toCompareHashes[i];
                for (std::size_t j = 0; j < alreadyComparedHashes.size(); ++j) {

                    unsigned int distance = 0;
                    std::span<const unsigned char> alreadyComparedHash = alreadyComparedHashes[j];
                    std::size_t toCompareHashPos = 0;
                    std::size_t alreadyComparedHashPos = 0;
                    while (toCompareHashPos < toCompareHash.size()) {
                        unsigned char toCompareHashEntrySize = toCompareHash[toCompareHashPos];
                        ++toCompareHashPos;
                        unsigned char alreadyComparedHashEntrySize = alreadyComparedHash[alreadyComparedHashPos];
                        ++alreadyComparedHashPos;
                        if (toCompareHashEntrySize == alreadyComparedHashEntrySize) {
                            if (toCompareHashEntrySize != 0) {
                                for (std::size_t k = 0; k < totalWeightOctos; k += 8) {
                                    distance += totalWeights[k + 0][static_cast<short>(toCompareHash[toCompareHashPos + k + 0]) - alreadyComparedHash[alreadyComparedHashPos + k + 0] + ABS_OFFSET]
                                              + totalWeights[k + 1][static_cast<short>(toCompareHash[toCompareHashPos + k + 1]) - alreadyComparedHash[alreadyComparedHashPos + k + 1] + ABS_OFFSET]
                                              + totalWeights[k + 2][static_cast<short>(toCompareHash[toCompareHashPos + k + 2]) - alreadyComparedHash[alreadyComparedHashPos + k + 2] + ABS_OFFSET]
                                              + totalWeights[k + 3][static_cast<short>(toCompareHash[toCompareHashPos + k + 3]) - alreadyComparedHash[alreadyComparedHashPos + k + 3] + ABS_OFFSET]
                                              + totalWeights[k + 4][static_cast<short>(toCompareHash[toCompareHashPos + k + 4]) - alreadyComparedHash[alreadyComparedHashPos + k + 4] + ABS_OFFSET]
                                              + totalWeights[k + 5][static_cast<short>(toCompareHash[toCompareHashPos + k + 5]) - alreadyComparedHash[alreadyComparedHashPos + k + 5] + ABS_OFFSET]
                                              + totalWeights[k + 6][static_cast<short>(toCompareHash[toCompareHashPos + k + 6]) - alreadyComparedHash[alreadyComparedHashPos + k + 6] + ABS_OFFSET]
                                              + totalWeights[k + 7][static_cast<short>(toCompareHash[toCompareHashPos + k + 7]) - alreadyComparedHash[alreadyComparedHashPos + k + 7] + ABS_OFFSET];
                                }
                                
                                for (std::size_t k = totalWeightOctos; k < totalWeights.size(); ++k) {
                                    distance += totalWeights[k][static_cast<short>(toCompareHash[toCompareHashPos + k]) - alreadyComparedHash[alreadyComparedHashPos + k] + ABS_OFFSET];
                                }
                            }
                        } else {
                            distance += missingEntryWeight;
                        }

                        if (distance > distanceCutoff) {
                            break;
                        }

                        toCompareHashPos += toCompareHashEntrySize;
                        alreadyComparedHashPos += alreadyComparedHashEntrySize;
                    }

                    if (distance <= distanceCutoff) {
                        comparisonsMade.push_back(ComparisonMade {
                            .firstHashIndex = static_cast<unsigned int>(alreadyComparedHashes.size()),
                            .secondHashIndex = static_cast<unsigned int>(j),
                            .distance = distance
                        });
                    }

                }

                alreadyComparedHashes.push_back(std::vector<unsigned char>(toCompareHash.begin(), toCompareHash.end()));
            }

            std::sort(comparisonsMade.begin(), comparisonsMade.end(), [](const ComparisonMade& a, const ComparisonMade& b) {
                return a.distance < b.distance;
            });

            std::string output;
            std::size_t outputLocation = 0;
            output.reserve(comparisonsMade.size() * 12);
            for (const auto& comparisonMade : comparisonsMade) {
                serializeUInt32(comparisonMade.firstHashIndex, output, outputLocation);
                outputLocation += 4;
                serializeUInt32(comparisonMade.secondHashIndex, output, outputLocation);
                outputLocation += 4;
                serializeUInt32(comparisonMade.distance, output, outputLocation);
                outputLocation += 4;
            }
            writeFile(writeOutputFileName, output);
        } else if (op == "exit") {
        } else {
            std::cout << "BAD COMMAND!" << std::endl;
            badCommand = true;
        }

        if (!badCommand) {
            std::cout << "OK!" << std::endl;
        }
    }
}