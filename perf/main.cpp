#include <string>
#include <iostream>
#include <fstream>
#include <sstream>
#include <istream>

#include "tag-file-maintainer.hpp"

std::size_t totalTagsToFiles = 0;
unsigned short currentBucketCount = 16;
std::unordered_map<unsigned short, std::unordered_map<uint64_t, std::unordered_set<uint64_t>>> tagHashToTagsToFiles;

unsigned short wantedBucketCount() {
    // i want each bucket to stay ~4MB
    // tag to file count * 16 == byte count
    std::size_t totalByteCount = totalTagsToFiles * 16;
    // divides by 8MB
    std::size_t unroundedBucketCount = totalByteCount >> 23;
    unsigned short roundedBucketCount = 1;
    while (unroundedBucketCount != 0) {
        unroundedBucketCount >>= 1;
        roundedBucketCount <<= 1;
    }
}

namespace {
    std::string Output_File_Name = "perf-output.txt";
    void outputFileWriter(const std::string& outputData) {
        util::writeFile(Output_File_Name, outputData);
    }
};

int main(int argc, const char** argv) {
    std::string inputFileName = "perf-input.txt";
    std::string dataStorageDirectory = "tag-pairings";
    if (argc > 1) {
        inputFileName = argv[1];
    }
    if (argc > 2) {
        Output_File_Name = argv[2];
    }
    if (argc > 3) {
        dataStorageDirectory = argv[3];
    }
    
    auto tfm = TagFileMaintainer(dataStorageDirectory);
    std::string op;
    while (op != "exit") {
        bool badCommand = false;
        std::getline(std::cin, op);
        std::ifstream file(inputFileName);
        std::stringstream buffer;
        buffer << file.rdbuf();
        std::string input = buffer.str();
        if (op == "insert_files") {
            tfm.insertFiles(input);
        } else if (op == "insert_tags") {
            tfm.insertTags(input);
        }  else if (op == "insert_tag_pairings") {
            tfm.insertPairings(input);
        } else if (op == "toggle_tag_pairings") {
            tfm.togglePairings(input);
        } else if (op == "delete_tag_pairings") {
            tfm.deletePairings(input);
        } else if (op == "read_files_tags") {
            tfm.readFilesTags(input, outputFileWriter);
        } else if (op == "search") {
            tfm.search(input, outputFileWriter);
        } else if (op == "exit") {
            if (tfm.needsMaintenance()) {
                std::cout << "DO MAINTENANCE?" << std::endl;
                std::getline(std::cin, op);
                if (op == "OK") {
                    tfm.doMaintenance();
                }
            }

            tfm.close();
        } else {
            std::cout << "BAD COMMAND!" << std::endl;
            badCommand = true;
        }

        if (!badCommand) {
            std::cout << "OK!" << std::endl;
        }
    }
    
}