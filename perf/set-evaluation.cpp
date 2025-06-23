#include "set-evaluation.hpp"

#include <stdexcept>
#include <iostream>

SetEvaluation::SetEvaluation(bool isComplement, const std::unordered_set<uint64_t>* universe, std::unordered_set<uint64_t> items)
    : isComplement(isComplement), universe(universe), items(std::move(items)), itemsPtr(&this->items.value())
{}

SetEvaluation::SetEvaluation(bool isComplement, const std::unordered_set<uint64_t>* universe, const std::unordered_set<uint64_t>* items)
    : isComplement(isComplement), universe(universe), itemsPtr(items)
{}

SetEvaluation::SetEvaluation(SetEvaluation&& setEvaluation) {
    if (setEvaluation.items.has_value()) {
        items = std::move(setEvaluation.items);
        itemsPtr = &items.value();
    } else {
        itemsPtr = setEvaluation.itemsPtr;
    }
    
    universe = setEvaluation.universe;
    isComplement = setEvaluation.isComplement;
}

SetEvaluation& SetEvaluation::operator=(SetEvaluation&& setEvaluation) {
    if (setEvaluation.items.has_value()) {
        items = std::move(setEvaluation.items);
        itemsPtr = &items.value();
    } else {
        itemsPtr = setEvaluation.itemsPtr;
    }
    
    universe = setEvaluation.universe;
    isComplement = setEvaluation.isComplement;

    return *this;
}

std::unordered_set<uint64_t> SetEvaluation::releaseResult() {
    if (isComplement) {
        std::unordered_set<uint64_t> itemsComplement;
        for (auto item : *universe) {
            if (!itemsPtr->contains(item)) {
                itemsComplement.insert(item);
            }
        }
        return std::move(itemsComplement);
    } else if (items) {
        return std::move(items.value());
    } else {
        return *itemsPtr;
    }
}

void SetEvaluation::complement() {
    isComplement = !isComplement;
}

std::size_t SetEvaluation::size() const {
    if (isComplement) {
        return universe->size() - itemsPtr->size();
    } else {
        return itemsPtr->size();
    }
}

SetEvaluation SetEvaluation::rightHandSide(SetEvaluation lhsSet, SetEvaluation rhsSet) {
    return SetEvaluation(rhsSet.isComplement, rhsSet.universe, std::unordered_set<uint64_t>(*rhsSet.itemsPtr));
}
SetEvaluation SetEvaluation::symmetricDifference(SetEvaluation lhsSet, SetEvaluation rhsSet) {
    if (lhsSet.universe != rhsSet.universe) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe;

    if (lhsSet.isComplement) {
        if (rhsSet.isComplement) {
            // ~A ^ ~B <=> A ^ B
            return SetEvaluation(false, universe, usetSymmetricDifference_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        } else {
            // (A ^ ~B) <=> (A N B) U (~A N ~B)  <=> (A U (~A U ~B)) N (B U (~A U ~B)) <=> (A U ~B) N (~A U B) <=> ~(~A N B) N ~(A N ~B) <=> ~((~A N B) U (A N ~B)) <=> ~(A ^ B)
            return SetEvaluation(true, universe, usetSymmetricDifference_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        }
    } else {
        if (rhsSet.isComplement) {
            // (A ^ ~B) <=> (A N B) U (~A N ~B)  <=> (A U (~A U ~B)) N (B U (~A U ~B)) <=> (A U ~B) N (~A U B) <=> ~(~A N B) N ~(A N ~B) <=> ~((~A N B) U (A N ~B)) <=> ~(A ^ B)
            return SetEvaluation(true, universe, usetSymmetricDifference_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        } else {
            // A ^ B
            return SetEvaluation(false, universe, usetSymmetricDifference_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        }
    }
}
SetEvaluation SetEvaluation::difference(SetEvaluation lhsSet, SetEvaluation rhsSet) {
    if (lhsSet.universe != rhsSet.universe) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe;

    if (lhsSet.isComplement) {
        if (rhsSet.isComplement) {
            // ~A - ~B <=> ~A N B <=> B N ~A
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*rhsSet.itemsPtr, *lhsSet.itemsPtr));
        } else {
            // ~A - B <=> ~A N ~B <=> ~(A U B)
            return SetEvaluation(true, universe, usetUnion_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        }
    } else {
        if (rhsSet.isComplement) {
            // A - ~B <=> A N B
            return SetEvaluation(false, universe, usetIntersect_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        } else {
            // A - B <=> A N ~B
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        }
    }
}
SetEvaluation SetEvaluation::intersect(SetEvaluation lhsSet, SetEvaluation rhsSet) {
    if (lhsSet.universe != rhsSet.universe) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe;

    if (lhsSet.isComplement) {
        if (rhsSet.isComplement) {
            // ~A N ~B <=> ~(A U B)
            return SetEvaluation(true, universe, usetUnion_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        } else {
            // ~A N B <=> B N ~A
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*rhsSet.itemsPtr, *lhsSet.itemsPtr));
        }
    } else {
        if (rhsSet.isComplement) {
            // A N ~B
            return SetEvaluation(false, universe, usetIntersectRHSComplement_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        } else {
            // A N B
            return SetEvaluation(false, universe, usetIntersect_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        }
    }

}
SetEvaluation SetEvaluation::setUnion(SetEvaluation lhsSet, SetEvaluation rhsSet) {
    if (!lhsSet.items.has_value()) {
        throw std::logic_error("LHS did not have real value");
    }
    if (lhsSet.universe != rhsSet.universe) {
        throw std::logic_error("Sets had different universe values");
    }
    const auto* universe = lhsSet.universe;

    if (lhsSet.isComplement) {
        if (rhsSet.isComplement) {
            // ~A U ~B <=> ~(A N B)
            return SetEvaluation(true, universe, usetIntersect_(std::move(*lhsSet.items), *rhsSet.itemsPtr));
        } else {
            // ~A U B <=> ~(A N ~B)
            return SetEvaluation(true, universe, usetIntersectRHSComplement_(*lhsSet.itemsPtr, *rhsSet.itemsPtr));
        }
    } else {
        if (rhsSet.isComplement) {
            // A U ~B <=> ~(~A N B) <=> ~(B N ~A)
            return SetEvaluation(true, universe, usetIntersectRHSComplement_(*rhsSet.itemsPtr, *lhsSet.itemsPtr));
        } else {
            // A U B
            usetUnion_(*lhsSet.items, *rhsSet.itemsPtr);
            return SetEvaluation(false, universe, std::move(*lhsSet.items));
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