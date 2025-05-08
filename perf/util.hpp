#pragma once
#include <string>
#include <filesystem>

namespace util {
    void serializeUInt64(const uint64_t& i, std::string& str, std::size_t& location);
    uint64_t deserializeUInt64(std::string_view str);
    void writeFile(const std::filesystem::path& filePath, std::string_view data);
    std::string readFile(const std::filesystem::path& filePath);

    template <class T, class TContainer>
    void toggle(TContainer& container, const T& item) {
        if (container.contains(item)) {
            container.erase(item);
        } else {
            container.insert(item);
        }
    }
}