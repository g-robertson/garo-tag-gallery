#include "util.hpp"

#include <bit>
#include <fstream>
#include <iostream>


std::size_t util::serializeUInt16(const uint16_t& i, std::string& str, std::size_t location) {
    if (location + 2 > str.size()) {
        str.resize(location + 2);
    }

    memcpy(str.data() + location, &i, 2);

    return location + 2;
}

uint16_t util::deserializeUInt16(std::string_view str, std::size_t& inputOffset) {
    uint16_t i;
    memcpy(&i, str.data() + inputOffset, 2);
    inputOffset += 2;

    return i;
}

std::size_t util::serializeUInt32(const uint32_t& i, std::string& str, std::size_t location) {
    if (location + 4 > str.size()) {
        str.resize(location + 4);
    }

    memcpy(str.data() + location, &i, 4);

    return location + 4;
}

uint32_t util::deserializeUInt32(std::string_view str, std::size_t& inputOffset) {
    uint32_t i;
    memcpy(&i, str.data() + inputOffset, 4);
    inputOffset += 4;

    return i;
}

std::size_t util::serializeUInt64(const uint64_t& i, std::string& str, std::size_t location) {
    if (location + 8 > str.size()) {
        str.resize(location + 8);
    }

    memcpy(str.data() + location, &i, 8);

    return location + 8;
}

uint64_t util::deserializeUInt64(std::string_view str, std::size_t& inputOffset) {
    uint64_t i;
    memcpy(&i, str.data() + inputOffset, 8);
    inputOffset += 8;

    return i;
}

std::size_t util::serializeFloat(const float& i, std::string& str, std::size_t location) {
    if (location + 4 > str.size()) {
        str.resize(location + 4);
    }

    memcpy(str.data() + location, &i, 4);

    return location + 4;

}

float util::deserializeFloat(std::string_view str, std::size_t& inputOffset) {
    float i;
    memcpy(&i, str.data() + inputOffset, 4);
    inputOffset += 4;

    return i;
}

std::size_t util::serializeDouble(const double& i, std::string& str, std::size_t location) {
    if (location + 8 > str.size()) {
        str.resize(location + 8);
    }

    memcpy(str.data() + location, &i, 8);

    return location + 8;
}

double util::deserializeDouble(std::string_view str, std::size_t& inputOffset) {
    double i;
    memcpy(&i, str.data() + inputOffset, 8);
    inputOffset += 8;

    return i;
}


std::size_t util::serializeUChar(unsigned char c, std::string& str, std::size_t location) {
    if (location + 1 > str.size()) {
        str.resize(location + 1);
    }
    str[location] = c;
    ++location;

    return location;
}
unsigned char util::deserializeUChar(std::string_view str, std::size_t& inputOffset) {
    unsigned char i = str[inputOffset];
    ++inputOffset;

    return i;
}

std::size_t util::serializeChar(char c, std::string& str, std::size_t location) {
    if (location + 1 > str.size()) {
        str.resize(location + 1);
    }
    str[location] = c;
    ++location;

    return location;
}

char util::deserializeChar(std::string_view str, std::size_t& inputOffset) {
    char i = str[inputOffset];
    ++inputOffset;

    return i;
}

std::string util::deserializeString(std::string_view str, std::size_t& inputOffset) {
    auto length = deserializeUInt32(str, inputOffset);
    auto deserializedString = std::string(str.substr(inputOffset, length));
    inputOffset += length;

    return deserializedString;
}


std::size_t util::serializeUCharSpan(const std::span<const unsigned char>& ucharSpan, std::string& str, std::size_t location) {
    if (location + ucharSpan.size() + 4 > str.size()) {
        str.resize(location + ucharSpan.size() + 4);
    }

    location = serializeUInt32(ucharSpan.size(), str, location);
    memcpy(str.data() + location, ucharSpan.data(), ucharSpan.size());

    return location + ucharSpan.size();
}

std::vector<unsigned char> util::deserializeUCharVector(std::string_view str, std::size_t& inputOffset) {
    auto length = deserializeUInt32(str, inputOffset);
    auto vec = std::vector<unsigned char>(str.data() + inputOffset, str.data() + inputOffset + length);
    inputOffset += length;
    return vec;
}

std::string_view util::deserializeStringView(std::string_view str, std::size_t& inputOffset) {
    auto length = deserializeUInt32(str, inputOffset);
    auto deserializedStringView = str.substr(inputOffset, length);
    inputOffset += length;

    return deserializedStringView;
}

std::string_view util::deserializeFixedLengthStringView(std::string_view str, std::size_t length, std::size_t& inputOffset) {
    auto deserializedStringView = str.substr(inputOffset, length);
    inputOffset += length;

    return deserializedStringView;
}

std::vector<unsigned char> util::strToUCharVector(std::string_view str) {
    return std::vector<unsigned char>(reinterpret_cast<const unsigned char*>(str.data()), reinterpret_cast<const unsigned char*>(str.data() + str.size()));
}

std::string_view util::ucharVectorToStringView(const std::vector<unsigned char>& vec) {
    return std::string_view(reinterpret_cast<const char*>(vec.data()), vec.size());
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