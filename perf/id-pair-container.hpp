#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <unordered_set>

class IdPairContainer {
    public:
        std::pair<typename std::unordered_set<uint64_t>::iterator, bool> insert(std::pair<uint64_t, uint64_t> item);
        bool erase(std::pair<uint64_t, uint64_t> item);
        bool contains(std::pair<uint64_t, uint64_t> item) const;
        // Gets all second id's associated with first id
        const std::unordered_set<uint64_t>* firstContents(uint64_t first) const;
        const std::unordered_map<uint64_t, std::unordered_set<uint64_t>>& allContents() const;
        std::size_t size() const;
        void clear();
    private:
        std::unordered_map<uint64_t, std::unordered_set<uint64_t>> container;

        std::size_t size_ = 0;
};