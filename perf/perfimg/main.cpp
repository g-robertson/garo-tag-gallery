#include <string>
#include <fstream>
#include <sstream>
#include <string_view>
#include <filesystem>
#include <iostream>

#include "hasher.hpp"
#include "hash-comparer.hpp"
#include "../common/util.hpp"


namespace {
    std::string Write_Output_File_Name = "hash-write-output.txt";
    std::string Read_Output_File_Name = "hash-read-output.txt";
    void writeOutputFileWriter(const std::string& outputData) {
        util::writeFile(Write_Output_File_Name, outputData);
    }
    void readOutputFileWriter(const std::string& outputData) {
        util::writeFile(Read_Output_File_Name, outputData);
    }
};

int main(int argc, const char** argv) {
    std::string writeInputFileName = "hash-write-input.txt";
    if (argc > 1) {
        writeInputFileName = argv[1];
    }
    if (argc > 2) {
        Write_Output_File_Name = argv[2];
    }

    HashComparer hashComparer;

    Hasher hasher;


    std::string op;
    while (op != "exit") {
        bool badCommand = false;
        std::getline(std::cin, op);

        std::ifstream file(writeInputFileName, std::ios::in | std::ios::binary);
        std::stringstream buffer;
        buffer << file.rdbuf();
        std::string input = buffer.str();
        auto inputSV = std::string_view(input);

        if (op == "set_compared_files") {
            hashComparer.setComparedFiles(inputSV);
        } else if (op == "compare_hashes") {
            hashComparer.compareHashes(inputSV, writeOutputFileWriter, hasher);
        } else if (op == "assign_hashes") {
            hasher.assignHashes(inputSV);
        } else if (op == "perform_hashes") {
            hasher.performHashes(inputSV);
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