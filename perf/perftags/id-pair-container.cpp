#include "id-pair-container.hpp"

#include <stdexcept>

#include "../common/util.hpp"

IdPairDiffContainer::IdPairDiffContainer(std::unordered_map<uint64_t, std::unordered_set<uint64_t>> container)
    : contents_(std::move(container))
{
    for (const auto& pair : contents_) {
        size_ += pair.second.size();
    }
}

std::string IdPairDiffContainer::serialize() const {
    std::string pairingsStr;

    // 8 bytes for each second, + 16 bytes for each (first + length)
    pairingsStr.resize((8 * size()) + (16 * contents_.size()));
    std::size_t location = 0;
    for (const auto& pair : contents_) {
        if (pair.second.size() == 0) {
            continue;
        }

        // {first}
        location = util::serializeUInt64(pair.first, pairingsStr, location);
        // {physical size}
        location = util::serializeUInt64(pair.second.size(), pairingsStr, location);

        for (auto second : pair.second) {
            // {second}
            location = util::serializeUInt64(second, pairingsStr, location);
        }
    }

    pairingsStr.resize(location);

    return pairingsStr;
}

IdPairDiffContainer IdPairDiffContainer::deserialize(std::string_view str, const std::unordered_set<uint64_t>* secondUniverse) {
    std::size_t inputOffset = 0;

    if (str.size() % 8 != 0) {
        throw std::logic_error(std::string("Input is malformed, not an even interval of 8"));
    }

    auto output = std::unordered_map<uint64_t, std::unordered_set<uint64_t>>();
    while (inputOffset < str.size()) {
        uint64_t first = util::deserializeUInt64(str, inputOffset);
        uint64_t count = util::deserializeUInt64(str, inputOffset);
        
        auto secondItems = std::unordered_set<uint64_t>();
        for (std::size_t i = 0; i < count; ++i) {
            uint64_t secondItem = util::deserializeUInt64(str, inputOffset);
            secondItems.insert(secondItem);
        }

        output.insert({first, std::move(secondItems)});
    }

    return IdPairDiffContainer(std::move(output));
}

IdPairDiffInsertReturnType IdPairDiffContainer::insert(std::pair<uint64_t, uint64_t> item) {
    auto firstIt = contents_.find(item.first);
    if (firstIt == contents_.end()) {
        firstIt = contents_.insert({item.first, std::unordered_set<uint64_t>()}).first;
    }

    auto secondIt = firstIt->second.find(item.second);
    if (secondIt == firstIt->second.end()) {
        firstIt->second.insert(item.second);
        ++size_;
        return IdPairDiffInsertReturnType {.second = true};
    }
    
    return IdPairDiffInsertReturnType {.second = false};
}

IdPairDiffInsertReturnType IdPairDiffContainer::erase(std::pair<uint64_t, uint64_t> item) {
    auto firstIt = contents_.find(item.first);
    if (firstIt == contents_.end()) {
        return IdPairDiffInsertReturnType {.second = false};
    }

    auto secondIt = firstIt->second.find(item.second);
    if (secondIt == firstIt->second.end()) {
        return IdPairDiffInsertReturnType {.second = false};
    }
    
    firstIt->second.erase(secondIt);
    --size_;
    return IdPairDiffInsertReturnType {.second = true};
}

bool IdPairDiffContainer::contains(std::pair<uint64_t, uint64_t> item) const {
    auto firstIt = contents_.find(item.first);
    if (firstIt == contents_.end()) {
        return false;
    }

    return firstIt->second.find(item.second) != firstIt->second.end();
}

std::size_t IdPairDiffContainer::size() const {
    return size_;
}

bool IdPairDiffContainer::empty() const {
    return size_ == 0;
}

void IdPairDiffContainer::clear() {
    contents_.clear();
    size_ = 0;
}

const std::unordered_map<uint64_t, std::unordered_set<uint64_t>>& IdPairDiffContainer::allContents() const {
    return contents_;
}


IdPairSecond::IdPairSecond(const std::unordered_set<uint64_t>* universe)
    : universe_(universe)
{}
IdPairSecond::IdPairSecond(const std::unordered_set<uint64_t>* universe, bool isComplement, std::unordered_set<uint64_t> physicalContents)
    : universe_(universe), isComplement_(isComplement), contents_(std::move(physicalContents))
{}

IdPairInsertReturnType IdPairSecond::insert(uint64_t second) {
    auto inserted = insert_(second);

    if (inserted) {
        updateComplement();
    }

    return IdPairInsertReturnType {.second = inserted};
}

bool IdPairSecond::insert_(uint64_t second) {
    auto it = contents_.find(second);
    if (isComplement_) {
        if (it != contents_.end()) {
            contents_.erase(it);
            return true;
        }
    } else if (it == contents_.end()) {
        contents_.insert(second);
        return true;
    }

    return false;
}

IdPairInsertReturnType IdPairSecond::erase(uint64_t second) {
    auto erased = erase_(second);
    
    if (erased) {
        updateComplement();
    }

    return IdPairInsertReturnType {.second = erased};
}
bool IdPairSecond::erase_(uint64_t second) {
    auto it = contents_.find(second);
    if (isComplement_) {
        if (it == contents_.end()) {
            contents_.insert(second);
            return true;
        }
    } else if (it != contents_.end()) {
        contents_.erase(it);
        return true;
    }

    return false;
}

#include <iostream>
void IdPairSecond::updateComplement() {
    if (contents_.size() > 0.6 * universe_->size()) {
        flipComplement();
    }
}
void IdPairSecond::flipComplement() {
    std::unordered_set<uint64_t> newContents;
    for (auto item : *universe_) {
        if (!contents_.contains(item)) {
            newContents.insert(item);
        }
    }

    contents_ = std::move(newContents);
    isComplement_ = !isComplement_;
}

IdPairInsertReturnType IdPairSecond::insertComplement(uint64_t second) {
    auto inserted = insertComplement_(second);

    return IdPairInsertReturnType {.second = inserted};
}
bool IdPairSecond::insertComplement_(uint64_t second) {
    if (!isComplement_) {
        throw std::logic_error("insertComplement should only be called on IdPairSecond's who are complemented");
    }
    if (contents_.contains(second)) {
        throw std::logic_error("insertComplement should not be called twice for the same entry");
    }

    return contents_.insert(second).second;
}

void IdPairSecond::deleteComplement(uint64_t second) {
    if (!isComplement_) {
        throw std::logic_error("deleteComplement should only be called on IdPairSecond's who are complemented");
    }
    if (!contents_.contains(second)) {
        throw std::logic_error("deleteComplement should not be called twice for the same entry");
    }

    contents_.erase(second);
}

bool IdPairSecond::contains(uint64_t second) const {
    return contents_.contains(second) != isComplement_;
}

// Returns the underlying unordered_set's size of what items are contained if isComplement() is false
// or the underlying unordered_set's size of what items aren't contained if isComplement() is true
std::size_t IdPairSecond::physicalSize() const {
    return contents_.size();
}
bool IdPairSecond::isComplement() const {
    return isComplement_;
}
char IdPairSecond::complementIndicator() const {
    return isComplement_ ? IS_COMPLEMENT : IS_NOT_COMPLEMENT;
}
// Returns the underlying unordered_set containing what items are contained if isComplement() is false
// or the underlying unordered_set containing what items aren't contained if isComplement() is true
const std::unordered_set<uint64_t>& IdPairSecond::physicalContents() const {
    return contents_;
}
const std::unordered_set<uint64_t>* IdPairSecond::universe() const {
    return universe_;
}
// Returns the amount of items that are contained
std::size_t IdPairSecond::size() const {
    if (isComplement_) {
        return universe_->size() - contents_.size();
    } else {
        return contents_.size();
    }
}

IdPairContainer::IdPairContainer(const std::unordered_set<uint64_t>* secondUniverse)
    : secondUniverse_(secondUniverse)
{}

IdPairContainer::IdPairContainer(const std::unordered_set<uint64_t>* secondUniverse, std::unordered_map<uint64_t, IdPairSecond> container)
    : secondUniverse_(secondUniverse), container_(std::move(container))
{
    for (const auto& pair : container_) {
        if (pair.second.isComplement()) {
            firstComplements_.insert(pair.first);
        }
        physicalSize_ += pair.second.physicalSize();
        size_ += pair.second.size();
    }
}

IdPairInsertReturnType IdPairContainer::insert(std::pair<uint64_t, uint64_t> item) {
    if (secondUniverse_ == nullptr) {
        throw std::logic_error("Second universe must exist when using IdPairContainer");
    }
    // gross implementation detail leakage, FAKER must be allowed regardless of if it is in second universe
    if (!secondUniverse_->contains(item.second) && item.second != 0xFFFFFFFFFFFFFFFFULL) {
        throw std::logic_error(std::string("Second universe must contain second from item (") + std::to_string(item.first) + "," + std::to_string(item.second) + ") in order to insert");
    }

    auto firstIt = container_.find(item.first);
    if (firstIt == container_.end()) {
        firstIt = container_.insert({item.first, IdPairSecond(secondUniverse_)}).first;
    }

    physicalSize_ -= firstIt->second.physicalSize();
    auto inserted = firstIt->second.insert(item.second);
    if (inserted.second) {
        updateComplement(item.first);
        ++size_;
    }
    physicalSize_ += firstIt->second.physicalSize();
    return inserted;
}
 

IdPairInsertReturnType IdPairContainer::erase(std::pair<uint64_t, uint64_t> item) {
    if (secondUniverse_ == nullptr) {
        throw std::logic_error("Second universe must exist when using IdPairContainer");
    }
    // gross implementation detail leakage, FAKER must be allowed regardless of if it is in second universe
    if (!secondUniverse_->contains(item.second) && item.second != 0xFFFFFFFFFFFFFFFFULL) {
        throw std::logic_error("Second universe must contain second in order to erase");
    }

    auto firstIt = container_.find(item.first);
    if (firstIt == container_.end()) {
        firstIt = container_.insert({item.first, IdPairSecond(secondUniverse_)}).first;
    }

    physicalSize_ -= firstIt->second.physicalSize();
    auto erased = firstIt->second.erase(item.second);
    if (erased.second) {
        updateComplement(item.first);
        --size_;
    }
    physicalSize_ += firstIt->second.physicalSize();

    return erased;
}

void IdPairContainer::insertComplement(uint64_t second) {
    if (secondUniverse_ == nullptr) {
        throw std::logic_error("Second universe must exist when using IdPairContainer");
    }
    if (firstComplements_.empty()) {
        return;
    }

    for (auto first : firstComplements_) {
        auto& secondContainer = container_.at(first);
        physicalSize_ -= secondContainer.physicalSize();
        secondContainer.insertComplement(second);
        physicalSize_ += secondContainer.physicalSize();
    }

    return;
}

void IdPairContainer::deleteComplement(uint64_t second) {
    if (secondUniverse_ == nullptr) {
        throw std::logic_error("Second universe must exist when using IdPairContainer");
    }
    if (firstComplements_.empty()) {
        return;
    }

    for (auto first : firstComplements_) {
        auto& secondContainer = container_.at(first);
        physicalSize_ -= secondContainer.physicalSize();
        secondContainer.deleteComplement(second);
        physicalSize_ += secondContainer.physicalSize();
    }

    return;
}

bool IdPairContainer::contains(std::pair<uint64_t, uint64_t> item) const {
    auto firstIt = container_.find(item.first);
    if (firstIt == container_.end()) {
        return false;
    }

    return firstIt->second.contains(item.second);
}

std::size_t IdPairContainer::size() const {
    return size_;
}

std::size_t IdPairContainer::physicalSize() const {
    return physicalSize_;
}

void IdPairContainer::clear() {
    container_.clear();
    size_ = 0;
    physicalSize_ = 0;
}

const std::unordered_map<uint64_t, IdPairSecond>& IdPairContainer::allContents() const {
    return container_;
}

const IdPairSecond* IdPairContainer::firstContents(uint64_t first) const {
    auto it = container_.find(first);
    if (it == container_.end()) {
        return nullptr;
    }
    return &it->second;
}

void IdPairContainer::updateComplement(uint64_t first) {
    auto firstIsComplement = container_.at(first).isComplement();
    if (firstIsComplement && !firstComplements_.contains(first)) {
        firstComplements_.insert(first);
    } else if (!firstIsComplement && firstComplements_.contains(first)) {
        firstComplements_.erase(first);
    }
}

const std::unordered_set<uint64_t>& IdPairContainer::firstComplements() const {
    return firstComplements_;
}

// we want to serialize pairings as:
// {first}{[C]omplement|[N]ot}{physical size}{physical seconds}
std::string IdPairContainer::serialize() const {
    std::string pairingsStr;

    // 8 bytes for each second, + 17 bytes for each (first + length + complement indicator)
    pairingsStr.resize((8 * physicalSize()) + (17 * container_.size()));
    std::size_t location = 0;
    std::size_t complementsSerialized = 0;
    for (const auto& pair : container_) {
        if (pair.second.size() == 0) {
            continue;
        }

        // {first}
        location = util::serializeUInt64(pair.first, pairingsStr, location);
        // {complement}
        location = util::serializeChar(pair.second.complementIndicator(), pairingsStr, location);
        if (pair.second.complementIndicator() == IdPairSecond::IS_COMPLEMENT) {
            ++complementsSerialized;
        }
        // {physical size}
        location = util::serializeUInt64(pair.second.physicalSize(), pairingsStr, location);

        for (auto physicalSecond : pair.second.physicalContents()) {
            // {physical second}
            location = util::serializeUInt64(physicalSecond, pairingsStr, location);
        }
    }

    pairingsStr.resize(location);

    return pairingsStr;
}

IdPairContainer IdPairContainer::deserialize(std::string_view str, const std::unordered_set<uint64_t>* secondUniverse) {
    std::size_t inputOffset = 0;

    auto output = std::unordered_map<uint64_t, IdPairSecond>();
    while (inputOffset < str.size()) {
        uint64_t first = util::deserializeUInt64(str, inputOffset);
        bool isComplement = util::deserializeChar(str, inputOffset) == IdPairSecond::IS_COMPLEMENT;
        uint64_t count = util::deserializeUInt64(str, inputOffset);
        
        auto secondItems = std::unordered_set<uint64_t>();
        for (std::size_t i = 0; i < count; ++i) {
            uint64_t secondItem = util::deserializeUInt64(str, inputOffset);
            secondItems.insert(secondItem);
        }
        output.insert({first, IdPairSecond(secondUniverse, isComplement, std::move(secondItems))});
    }

    return IdPairContainer(secondUniverse, std::move(output));
}