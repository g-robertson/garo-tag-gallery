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
    std::string Write_Output_File_Name = "perf-write-output.txt";
    std::string Read_Output_File_Name = "perf-read-output.txt";
    void writeOutputFileWriter(const std::string& outputData) {
        util::writeFile(Write_Output_File_Name, outputData);
    }
    void readOutputFileWriter(const std::string& outputData) {
        util::writeFile(Read_Output_File_Name, outputData);
    }
};

#ifdef TESTING_MODE
    #include "tests/test-tag-file-maintainer.hpp"
    #define TagFileMaintainer TestTagFileMaintainer
#else
    #define TagFileMaintainer TagFileMaintainer
#endif

int main(int argc, const char** argv) {
    std::string writeInputFileName = "perf-write-input.txt";
    std::string readInputFileName = "perf-read-input.txt";
    std::string dataStorageDirectory = "tag-pairings";
    if (argc > 1) {
        writeInputFileName = argv[1];
    }
    if (argc > 2) {
        Write_Output_File_Name = argv[2];
    }
    if (argc > 3) {
        readInputFileName = argv[3];
    }
    if (argc > 4) {
        Read_Output_File_Name = argv[4];
    }
    if (argc > 5) {
        dataStorageDirectory = argv[5];
    }

    auto tfm = TagFileMaintainer(dataStorageDirectory);
    std::unordered_set<std::string> WRITE_OPS = {
        "insert_taggables",
        "delete_taggables",
        "insert_tags",
        "delete_tags",
        "insert_tag_pairings",
        "toggle_tag_pairings",
        "delete_tag_pairings",
        "flush_files",
        "purge_unused_files",
        "begin_transaction",
        "end_transaction",
        "exit",
        "override"
    };
    std::unordered_set<std::string> READ_OPS = {
        "read_taggables_tags",
        "read_taggables_specified_tags",
        "read_tag_groups_taggable_counts",
        "search"
    };
    std::string op;
    while (op != "exit") {
        bool badCommand = false;
        std::getline(std::cin, op);

        std::string inputFileName = writeInputFileName;
        if (READ_OPS.contains(op)) {
            inputFileName = readInputFileName;
        }

        std::ifstream file(inputFileName, std::ios::in | std::ios::binary);
        std::stringstream buffer;
        buffer << file.rdbuf();
        std::string input = buffer.str();

        if (op == "insert_taggables") {
            tfm.insertTaggables(input);
        } else if (op == "delete_taggables") {
            tfm.deleteTaggables(input);
        } else if (op == "insert_tags") {
            tfm.insertTags(input);
        } else if (op == "delete_tags") {
            tfm.deleteTags(input);
        } else if (op == "insert_tag_pairings") {
            tfm.insertPairings(input);
        } else if (op == "toggle_tag_pairings") {
            tfm.togglePairings(input);
        } else if (op == "delete_tag_pairings") {
            tfm.deletePairings(input);
        } else if (op == "read_taggables_tags") {
            tfm.readTaggablesTags(input, readOutputFileWriter);
        } else if (op == "read_taggables_specified_tags") {
            tfm.readTaggablesSpecifiedTags(input, readOutputFileWriter);
        } else if (op == "read_tag_groups_taggable_counts") {
            tfm.readTagGroupsTaggableCountsWithSearch(input, readOutputFileWriter);
        } else if (op == "search") {
            tfm.search(input, readOutputFileWriter);
        } else if (op == "flush_files") {
            tfm.flushFiles();
        } else if (op == "purge_unused_files") {
            tfm.purgeUnusedFiles();
        } else if (op == "begin_transaction") {
            tfm.beginTransaction();
        } else if (op == "end_transaction") {
            tfm.endTransaction();
        } else if (op == "exit") {
            if (tfm.needsMaintenance()) {
                std::cout << "DO MAINTENANCE?" << std::endl;
                std::getline(std::cin, op);
                if (op == "OK") {
                    tfm.doMaintenance();
                }
            }

            tfm.close();
        }
        #ifdef TESTING_MODE
        else if (op == "override") {
            tfm.overrideMode = input;
        }
        #endif
        else {
            std::cout << "BAD COMMAND!" << std::endl;
            badCommand = true;
        }

        if (!badCommand) {
            if (inputFileName == writeInputFileName) {
                std::cout << "WRITE_OK!" << std::endl;
            } else {
                std::cout << "READ_OK!" << std::endl;
            }
        }
    }
    
}