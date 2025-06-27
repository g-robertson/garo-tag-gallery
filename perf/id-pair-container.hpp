#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>


struct IdPairDiffInsertReturnType {
    bool second;
};

class IdPairDiffContainer {
    public:
        IdPairDiffContainer() = default;
        using value_type = std::pair<uint64_t, uint64_t>;

        std::string serialize() const;
        static IdPairDiffContainer deserialize(std::string_view str, const std::unordered_set<uint64_t>* secondUniverse);
        
        IdPairDiffInsertReturnType insert(std::pair<uint64_t, uint64_t> item);
        IdPairDiffInsertReturnType erase(std::pair<uint64_t, uint64_t> item);

        bool contains(std::pair<uint64_t, uint64_t> item) const;
        std::size_t size() const;
        bool empty() const;
        void clear();

        const std::unordered_map<uint64_t, std::unordered_set<uint64_t>>& allContents() const;
    private:
        IdPairDiffContainer(std::unordered_map<uint64_t, std::unordered_set<uint64_t>> container);
        std::unordered_map<uint64_t, std::unordered_set<uint64_t>> contents_;
        std::size_t size_ = 0;
};

struct IdPairInsertReturnType {
    // whether or not the operation actually occurred (i.e. if the element was not already there for an insertion, or was already there for a deletion)
    bool second;
};

class IdPairSecond {
    public:
        IdPairSecond(const std::unordered_set<uint64_t>* universe);
        IdPairSecond(const std::unordered_set<uint64_t>* universe, bool isComplement, std::unordered_set<uint64_t> physicalContents);

        IdPairInsertReturnType insert(uint64_t second);
        IdPairInsertReturnType erase(uint64_t second);
        IdPairInsertReturnType insertComplement(uint64_t second);
        bool contains(uint64_t second) const;

        template <class T>
        void forEach(T callback) const {
            if (isComplement_) {
                for (auto item : *universe_) {
                    if (!contents_.contains(item)) {
                        callback(item);
                    }
                }
            } else {
                for (auto item : contents_) {
                    callback(item);
                }
            }
        }

        std::size_t physicalSize() const;
        bool isComplement() const;
        char complementIndicator() const;
        const std::unordered_set<uint64_t>& physicalContents() const;
        const std::unordered_set<uint64_t>* universe() const;
        std::size_t size() const;

        static const char IS_COMPLEMENT = 'C';
        static const char IS_NOT_COMPLEMENT = 'N';

    private:
        bool insert_(uint64_t second);
        bool erase_(uint64_t second);
        bool insertComplement_(uint64_t second);
        void updateComplement();
        void flipComplement();

        const std::unordered_set<uint64_t>* universe_;
        bool isComplement_ = false;
        std::unordered_set<uint64_t> contents_;
};

class IdPairContainer {
    public:
        using value_type = std::pair<uint64_t, uint64_t>;

        IdPairContainer() = default;
        IdPairContainer(const std::unordered_set<uint64_t>* secondUniverse);
        std::string serialize() const;
        static IdPairContainer deserialize(std::string_view str, const std::unordered_set<uint64_t>* secondUniverse);

        IdPairInsertReturnType insert(std::pair<uint64_t, uint64_t> item);
        void insertComplement(uint64_t second);
        IdPairInsertReturnType erase(std::pair<uint64_t, uint64_t> item);
        bool contains(std::pair<uint64_t, uint64_t> item) const;
        // Gets all second id's associated with first id
        const IdPairSecond* firstContents(uint64_t first) const;
        const std::unordered_set<uint64_t>& firstComplements() const;
        const std::unordered_map<uint64_t, IdPairSecond>& allContents() const;
        std::size_t size() const;
        std::size_t physicalSize() const;
        void clear();
    private:
        IdPairContainer(const std::unordered_set<uint64_t>* secondUniverse, std::unordered_map<uint64_t, IdPairSecond> container);
        void updateComplement(uint64_t first);

        std::unordered_set<uint64_t> firstComplements_;
        const std::unordered_set<uint64_t>* secondUniverse_;
        std::unordered_map<uint64_t, IdPairSecond> container_;

        std::size_t size_ = 0;
        std::size_t physicalSize_ = 0;
};