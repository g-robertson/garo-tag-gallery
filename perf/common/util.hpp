#pragma once
#include <string>
#include <filesystem>
#include <vector>
#include <ranges>

namespace util {
    std::size_t serializeUInt16(const uint16_t& i, std::string& str, std::size_t location);
    uint16_t deserializeUInt16(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeUInt32(const uint32_t& i, std::string& str, std::size_t location);
    uint32_t deserializeUInt32(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeUInt64(const uint64_t& i, std::string& str, std::size_t location);
    uint64_t deserializeUInt64(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeFloat(const float& i, std::string& str, std::size_t location);
    float deserializeFloat(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeDouble(const double& i, std::string& str, std::size_t location);
    double deserializeDouble(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeUChar(unsigned char c, std::string& str, std::size_t location);
    unsigned char deserializeUChar(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeChar(char c, std::string& str, std::size_t location);
    char deserializeChar(std::string_view str, std::size_t& inputOffset);
    std::string deserializeString(std::string_view str, std::size_t& inputOffset);
    std::size_t serializeUCharSpan(const std::span<const unsigned char>& ucharSpan, std::string& str, std::size_t location);
    std::vector<unsigned char> deserializeUCharVector(std::string_view str, std::size_t& inputOffset);
    std::string_view deserializeStringView(std::string_view str, std::size_t& inputOffset);
    std::string_view deserializeFixedLengthStringView(std::string_view str, std::size_t size, std::size_t& inputOffset);

    std::vector<unsigned char> strToUCharVector(std::string_view str);
    std::string_view ucharVectorToStringView(const std::vector<unsigned char>& vec);

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