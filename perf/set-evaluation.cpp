#include "set-evaluation.hpp"

#include <stdexcept>
#include <iostream>

SetEvaluation::SetEvaluation(bool isComplement, const std::unordered_set<uint64_t>* universe, std::unordered_set<uint64_t> items)
    : isComplement_(isComplement), universe_(universe), items_(std::move(items)), itemsPtr_(&this->items_.value())
{}

SetEvaluation::SetEvaluation(bool isComplement, const std::unordered_set<uint64_t>* universe, const std::unordered_set<uint64_t>* items)
    : isComplement_(isComplement), universe_(universe), itemsPtr_(items)
{}

SetEvaluation::SetEvaluation(SetEvaluation&& setEvaluation) {
    if (setEvaluation.items_.has_value()) {
        items_ = std::move(setEvaluation.items_);
        itemsPtr_ = &items_.value();
    } else {
        itemsPtr_ = setEvaluation.itemsPtr_;
    }
    
    universe_ = setEvaluation.universe_;
    isComplement_ = setEvaluation.isComplement_;
}

SetEvaluation& SetEvaluation::operator=(SetEvaluation&& setEvaluation) {
    if (setEvaluation.items_.has_value()) {
        items_ = std::move(setEvaluation.items_);
        itemsPtr_ = &items_.value();
    } else {
        itemsPtr_ = setEvaluation.itemsPtr_;
    }
    
    universe_ = setEvaluation.universe_;
    isComplement_ = setEvaluation.isComplement_;

    return *this;
}

std::unordered_set<uint64_t> SetEvaluation::releaseResult() {
    if (isComplement_) {
        std::unordered_set<uint64_t> itemsComplement;
        for (auto item : *universe_) {
            if (!itemsPtr_->contains(item)) {
                itemsComplement.insert(item);
            }
        }
        return itemsComplement;
    } else if (items_) {
        return std::move(items_.value());
    } else {
        return *itemsPtr_;
    }
}

void SetEvaluation::complement() {
    isComplement_ = !isComplement_;
}

std::size_t SetEvaluation::size() const {
    if (isComplement_) {
        return universe_->size() - itemsPtr_->size();
    } else {
        return itemsPtr_->size();
    }
}

SetEvaluation SetEvaluation::rightHandSide(SetEvaluation&& lhsSet, SetEvaluation rhsSet) {
    return SetEvaluation(rhsSet.isComplement_, rhsSet.universe_, std::unordered_set<uint64_t>(*rhsSet.itemsPtr_));
}
SetEvaluation SetEvaluation::symmetricDifference(SetEvaluation&& lhsSet, SetEvaluation rhsSet) {
    if (lhsSet.universe_ != rhsSet.universe_) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe_;

    if (lhsSet.isComplement_) {
        if (rhsSet.isComplement_) {
            // ~A ^ ~B <=> A ^ B
            return SetEvaluation(false, universe, usetSymmetricDifference_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        } else {
            // (A ^ ~B) <=> (A N B) U (~A N ~B)  <=> (A U (~A U ~B)) N (B U (~A U ~B)) <=> (A U ~B) N (~A U B) <=> ~(~A N B) N ~(A N ~B) <=> ~((~A N B) U (A N ~B)) <=> ~(A ^ B)
            return SetEvaluation(true, universe, usetSymmetricDifference_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        }
    } else {
        if (rhsSet.isComplement_) {
            // (A ^ ~B) <=> (A N B) U (~A N ~B)  <=> (A U (~A U ~B)) N (B U (~A U ~B)) <=> (A U ~B) N (~A U B) <=> ~(~A N B) N ~(A N ~B) <=> ~((~A N B) U (A N ~B)) <=> ~(A ^ B)
            return SetEvaluation(true, universe, usetSymmetricDifference_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        } else {
            // A ^ B
            return SetEvaluation(false, universe, usetSymmetricDifference_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        }
    }
}
SetEvaluation SetEvaluation::difference(SetEvaluation&& lhsSet, SetEvaluation rhsSet) {
    if (lhsSet.universe_ != rhsSet.universe_) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe_;

    if (lhsSet.isComplement_) {
        if (rhsSet.isComplement_) {
            // ~A - ~B <=> ~A N B <=> B N ~A
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*rhsSet.itemsPtr_, *lhsSet.itemsPtr_));
        } else {
            // ~A - B <=> ~A N ~B <=> ~(A U B)
            return SetEvaluation(true, universe, usetUnion_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        }
    } else {
        if (rhsSet.isComplement_) {
            // A - ~B <=> A N B
            return SetEvaluation(false, universe, usetIntersect_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        } else {
            // A - B <=> A N ~B
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        }
    }
}

SetEvaluation SetEvaluation::intersect(const SetEvaluation& lhsSet, SetEvaluation rhsSet) {
    if (lhsSet.universe_ != rhsSet.universe_) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe_;

    if (lhsSet.isComplement_) {
        if (rhsSet.isComplement_) {
            // ~A N ~B <=> ~(A U B)
            return SetEvaluation(true, universe, usetUnion_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        } else {
            // ~A N B <=> B N ~A
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*rhsSet.itemsPtr_, *lhsSet.itemsPtr_));
        }
    } else {
        if (rhsSet.isComplement_) {
            // A N ~B
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        } else {
            // A N B
            return SetEvaluation(false, universe, usetIntersect_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        }
    }
}

SetEvaluation SetEvaluation::intersect(SetEvaluation&& lhsSet, SetEvaluation rhsSet) {
    const auto& immutableLHSSet = lhsSet;
    return intersect(immutableLHSSet, std::move(rhsSet));
}

SetEvaluation SetEvaluation::setUnion(SetEvaluation&& lhsSet, SetEvaluation rhsSet) {
    if (!lhsSet.items_.has_value()) {
        throw std::logic_error("LHS did not have real value");
    }
    if (lhsSet.universe_ != rhsSet.universe_) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe_ = lhsSet.universe_;

    if (lhsSet.isComplement_) {
        if (rhsSet.isComplement_) {
            // ~A U ~B <=> ~(A N B)
            return SetEvaluation(true, universe_, usetIntersect_(std::move(*lhsSet.items_), *rhsSet.itemsPtr_));
        } else {
            // ~A U B <=> ~(A N ~B)
            return SetEvaluation(true, universe_, usetIntersectRHSComplement_(*lhsSet.itemsPtr_, *rhsSet.itemsPtr_));
        }
    } else {
        if (rhsSet.isComplement_) {
            // A U ~B <=> ~(~A N B) <=> ~(B N ~A)
            return SetEvaluation(true, universe_, usetIntersectRHSComplement_(*rhsSet.itemsPtr_, *lhsSet.itemsPtr_));
        } else {
            // A U B
            usetUnion_(*lhsSet.items_, *rhsSet.itemsPtr_);
            return SetEvaluation(false, universe_, std::move(*lhsSet.items_));
        }
    }
}

std::unordered_set<uint64_t>& SetEvaluation::usetUnion_(std::unordered_set<uint64_t>& modifiableSet, const std::unordered_set<uint64_t>& unmodifiableSet) {
    for (auto item : unmodifiableSet) {
        modifiableSet.insert(item);
    }

    return modifiableSet;
}

std::unordered_set<uint64_t> SetEvaluation::usetUnion_(const std::unordered_set<uint64_t>& smallerSet, const std::unordered_set<uint64_t>& largerSet) {
    if (smallerSet.size() > largerSet.size()) {
        return usetUnion_(largerSet, smallerSet);
    }

    std::unordered_set<uint64_t> result = largerSet;

    for (auto item : smallerSet) {
        result.insert(item);
    }

    return result;
}

std::unordered_set<uint64_t> SetEvaluation::usetIntersect_(const std::unordered_set<uint64_t>& smallerSet, const std::unordered_set<uint64_t>& largerSet) {
    if (smallerSet.size() > largerSet.size()) {
        return usetIntersect_(largerSet, smallerSet);
    }

    std::unordered_set<uint64_t> result;

    for (auto item : smallerSet) {
        if (largerSet.contains(item)) {
            result.insert(item);
        }
    }

    return result;
}

std::unordered_set<uint64_t> SetEvaluation::usetIntersectRHSComplement_(const std::unordered_set<uint64_t>& lhsSet, const std::unordered_set<uint64_t>& rhsSet) {
    std::unordered_set<uint64_t> result;

    for (auto item : lhsSet) {
        if (!rhsSet.contains(item)) {
            result.insert(item);
        }
    }
    return result;
}

std::unordered_set<uint64_t> SetEvaluation::usetSymmetricDifference_(const std::unordered_set<uint64_t>& lhsSet, const std::unordered_set<uint64_t>& rhsSet) {
    std::unordered_set<uint64_t> result;

    for (auto item : lhsSet) {
        if (!rhsSet.contains(item)) {
            result.insert(item);
        }
    }
    
    for (auto item : rhsSet) {
        if (!lhsSet.contains(item)) {
            result.insert(item);
        }
    }

    return result;
}