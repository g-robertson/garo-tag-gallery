#include "id-pair-container.hpp"

std::pair<typename std::unordered_set<uint64_t>::iterator, bool> IdPairContainer::insert(std::pair<uint64_t, uint64_t> item) {
    auto firstIt = container.find(item.first);
    if (firstIt == container.end()) {
        firstIt = container.insert({item.first, std::unordered_set<uint64_t>()}).first;
    }

    auto secondIt = firstIt->second.find(item.second);
    if (secondIt == firstIt->second.end()) {
        secondIt = firstIt->second.insert(item.second).first;
        ++size_;
        return {secondIt, true};
    }
    return {secondIt, false};
}

bool IdPairContainer::erase(std::pair<uint64_t, uint64_t> item) {
    auto firstIt = container.find(item.first);
    if (firstIt == container.end()) {
        firstIt = container.insert({item.first, std::unordered_set<uint64_t>()}).first;
    }

    auto secondIt = firstIt->second.find(item.second);
    if (secondIt != firstIt->second.end()) {
        firstIt->second.erase(secondIt);
        --size_;
        return true;
    }
    return false;
}

bool IdPairContainer::contains(std::pair<uint64_t, uint64_t> item) const {
    auto firstIt = container.find(item.first);
    if (firstIt == container.end()) {
        return false;
    }

    return firstIt->second.contains(item.second);
}

std::size_t IdPairContainer::size() const {
    return size_;
}

void IdPairContainer::clear() {
    container.clear();
    if (size_ != 0) {
        size_ = 0;
    }
}

const std::unordered_map<uint64_t, std::unordered_set<uint64_t>>& IdPairContainer::allContents() const {
    return container;
}

const std::unordered_set<uint64_t>* IdPairContainer::firstContents(uint64_t first) const {
    auto it = container.find(first);
    if (it == container.end()) {
        return nullptr;
    }
    return &it->second;
}