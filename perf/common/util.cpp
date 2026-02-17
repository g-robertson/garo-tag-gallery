#include "util.hpp"

#include <bit>
#include <fstream>
#include <iostream>


std::size_t util::serializeUInt32(const uint32_t& i, std::string& str, std::size_t location) {
    if (location + 4 > str.size()) {
        str.resize(location + 4);
    }

    memcpy(str.data() + location, &i, 4);

    return location + 4;
}

uint32_t util::deserializeUInt32(std::string_view str) {
    uint32_t i;
    memcpy(&i, str.data(), 4);
    return i;
}

std::size_t util::serializeUInt64(const uint64_t& i, std::string& str, std::size_t location) {
    if (location + 8 > str.size()) {
        str.resize(location + 8);
    }

    memcpy(str.data() + location, &i, 8);

    return location + 8;
}

uint64_t util::deserializeUInt64(std::string_view str) {
    uint64_t i;
    memcpy(&i, str.data(), 8);
    return i;
}

std::size_t util::serializeFloat(const float& i, std::string& str, std::size_t location) {
    if (location + 4 > str.size()) {
        str.resize(location + 4);
    }

    memcpy(str.data() + location, &i, 4);

    return location + 4;

}

float util::deserializeFloat(std::string_view str) {
    float i;
    memcpy(&i, str.data(), 4);
    return i;
}

std::size_t util::serializeDouble(const double& i, std::string& str, std::size_t location) {
    if (location + 8 > str.size()) {
        str.resize(location + 8);
    }

    memcpy(str.data() + location, &i, 8);

    return location + 8;
}

double util::deserializeDouble(std::string_view str) {
    double i;
    memcpy(&i, str.data(), 8);
    return i;
}

void util::serializeChar(char c, std::string& str, std::size_t& location) {
    if (location + 1 > str.size()) {
        str.resize(location + 1);
    }
    str[location] = c;
    ++location;
}

char util::deserializeChar(std::string_view str) {
    return str[0];
}

std::string util::deserializeString(std::string_view str, std::size_t length) {
    return std::string(str.substr(0, length));
}


std::size_t util::serializeUCharVector(const std::vector<unsigned char>& ucharVector, std::string& str, std::size_t location) {
    if (location + ucharVector.size() > str.size()) {
        str.resize(location + ucharVector.size());
    }

    memcpy(str.data() + location, ucharVector.data(), ucharVector.size());

    return location + ucharVector.size();
}

std::vector<unsigned char> util::deserializeUCharVector(std::string_view str, std::size_t length) {
    return std::vector<unsigned char>(str.data(), str.data() + length);
}

std::string_view util::deserializeStringView(std::string_view str, std::size_t length) {
    return str.substr(0, length);
}

void util::writeFile(const std::filesystem::path& filePath, std::string_view data) {
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
std::string util::readFile(const std::filesystem::path& filePath) {
    std::ifstream file(filePath, std::ios::in | std::ios::binary);
    if (file.fail()) {
        throw std::logic_error(std::string("File ") + filePath.generic_string() + " failed to open");
    }

    std::size_t size = std::filesystem::file_size(filePath);
    std::string buffer;
    buffer.resize(size);

    file.read(buffer.data(), size);

    return buffer;
}

void util::removeFile(const std::filesystem::path& filePath) {
    std::filesystem::path absoluteFilePath = std::filesystem::absolute(filePath);
    std::filesystem::remove(absoluteFilePath);
}