#pragma once
#include <string>
#include <filesystem>
#include <vector>

namespace util {
    std::size_t serializeUInt32(const uint32_t& i, std::string& str, std::size_t location);
    uint32_t deserializeUInt32(std::string_view str);
    std::size_t serializeUInt64(const uint64_t& i, std::string& str, std::size_t location);
    uint64_t deserializeUInt64(std::string_view str);
    float deserializeFloat(std::string_view str);
    void serializeChar(char c, std::string& str, std::size_t& location);
    char deserializeChar(std::string_view str);
    std::string deserializeString(std::string_view str, std::size_t length);
    std::vector<unsigned char> deserializeUCharVector(std::string_view str, std::size_t length);
    std::string_view deserializeStringView(std::string_view str, std::size_t length);
    void writeFile(const std::filesystem::path& filePath, std::string_view data);
    std::string readFile(const std::filesystem::path& filePath);
    void removeFile(const std::filesystem::path& filePath);

    template <class TContainer>
    using InsertReturnType = decltype(std::declval<TContainer>().insert(std::declval<typename TContainer::value_type>()));
    template <class TContainer>
    using EraseReturnType = decltype(std::declval<TContainer>().erase(std::declval<typename TContainer::value_type>()));
    

    static const bool INSERTED = true;
    static const bool ERASED = false;
    template <class TContainer>
    struct ToggleReturnType {
        bool insertType;
        union {
            InsertReturnType<TContainer> insertReturn;
            EraseReturnType<TContainer> eraseReturn;
        };
    };

    template<class TContainer>
    ToggleReturnType<TContainer> toggle(TContainer& container, const typename TContainer::value_type& item) {
        if (container.contains(item)) {
            auto eraseReturn = container.erase(item);
            return ToggleReturnType<TContainer> {
                .insertType = ERASED,
                .eraseReturn = eraseReturn
            };
        } else {
            auto insertReturn = container.insert(item);
            return ToggleReturnType<TContainer> {
                .insertType = INSERTED,
                .insertReturn = insertReturn
            };
        }
    }
};