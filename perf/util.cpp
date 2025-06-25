#include "util.hpp"

#include <bit>
#include <fstream>

void util::serializeUInt64(const uint64_t& i, std::string& str, std::size_t& location) {
    if (location + 8 > str.size()) {
        str.resize(location + 8);
    }

    str[location] =     std::bit_cast<char>(static_cast<unsigned char>((i >> 56ULL)          ));
    str[location + 1] = std::bit_cast<char>(static_cast<unsigned char>((i >> 48ULL) & 0xFFULL));
    str[location + 2] = std::bit_cast<char>(static_cast<unsigned char>((i >> 40ULL) & 0xFFULL));
    str[location + 3] = std::bit_cast<char>(static_cast<unsigned char>((i >> 32ULL) & 0xFFULL));
    str[location + 4] = std::bit_cast<char>(static_cast<unsigned char>((i >> 24ULL) & 0xFFULL));
    str[location + 5] = std::bit_cast<char>(static_cast<unsigned char>((i >> 16ULL) & 0xFFULL));
    str[location + 6] = std::bit_cast<char>(static_cast<unsigned char>((i >>  8ULL) & 0xFFULL));
    str[location + 7] = std::bit_cast<char>(static_cast<unsigned char>((i         ) & 0xFFULL));

    location += 8;
}

const uint8_t DESERIALIZE_FLOAT_INDEX_0 = (std::endian::native == std::endian::little) ? 0 : 3;
const uint8_t DESERIALIZE_FLOAT_INDEX_1 = (std::endian::native == std::endian::little) ? 1 : 2;
const uint8_t DESERIALIZE_FLOAT_INDEX_2 = (std::endian::native == std::endian::little) ? 2 : 1;
const uint8_t DESERIALIZE_FLOAT_INDEX_3 = (std::endian::native == std::endian::little) ? 3 : 0;

uint64_t util::deserializeUInt64(std::string_view str) {
    uint64_t i = (
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[0])) << 56ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[1])) << 48ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[2])) << 40ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[3])) << 32ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[4])) << 24ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[5])) << 16ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[6])) <<  8ULL) |
        (static_cast<uint64_t>(std::bit_cast<unsigned char>(str[7]))         )
    );

    return i;
}

float util::deserializeFloat(std::string_view str) {
    static unsigned char DESERIALIZATION_ARRAY[4];
    DESERIALIZATION_ARRAY[DESERIALIZE_FLOAT_INDEX_0] = std::bit_cast<unsigned char>(str[0]);
    DESERIALIZATION_ARRAY[DESERIALIZE_FLOAT_INDEX_1] = std::bit_cast<unsigned char>(str[1]);
    DESERIALIZATION_ARRAY[DESERIALIZE_FLOAT_INDEX_2] = std::bit_cast<unsigned char>(str[2]);
    DESERIALIZATION_ARRAY[DESERIALIZE_FLOAT_INDEX_3] = std::bit_cast<unsigned char>(str[3]);
    return std::bit_cast<float>(DESERIALIZATION_ARRAY);
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

    std::filesystem::rename(unfinishedFilePath, absoluteFilePath);
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