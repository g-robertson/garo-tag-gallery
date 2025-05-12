#pragma once

#include <unordered_set>
#include <optional>

class SetEvaluation {
    public:
        SetEvaluation(bool isComplement, const std::unordered_set<uint64_t>* universe, std::unordered_set<uint64_t> items);
        SetEvaluation(bool isComplement, const std::unordered_set<uint64_t>* universe, const std::unordered_set<uint64_t>* items);

        // Note: this will invalidate the SetEvaluation that the result was moved from
        std::unordered_set<uint64_t> releaseResult();

        static SetEvaluation rightHandSide(SetEvaluation lhsSet, SetEvaluation rhsSet);
        static SetEvaluation symmetricDifference(SetEvaluation lhsSet, SetEvaluation rhsSet);
        static SetEvaluation difference(SetEvaluation lhsSet, SetEvaluation rhsSet);
        static SetEvaluation intersect(SetEvaluation lhsSet, SetEvaluation rhsSet);
        static SetEvaluation setUnion(SetEvaluation lhsSet, SetEvaluation rhsSet);
    private:
        static std::unordered_set<uint64_t> usetIntersect_(const std::unordered_set<uint64_t>& smallerSet, const std::unordered_set<uint64_t>& largerSet);
        static std::unordered_set<uint64_t> usetUnion_(const std::unordered_set<uint64_t>& smallerSet, const std::unordered_set<uint64_t>& largerSet);
        static std::unordered_set<uint64_t> usetIntersectRHSComplement_(const std::unordered_set<uint64_t>& lhsSet, const std::unordered_set<uint64_t>& rhsSet);
        static std::unordered_set<uint64_t> usetSymmetricDifference_(const std::unordered_set<uint64_t>& lhsSet, const std::unordered_set<uint64_t>& rhsSet);
        bool isComplement;
        const std::unordered_set<uint64_t>* universe;
        std::optional<std::unordered_set<uint64_t>> items;
        const std::unordered_set<uint64_t>* itemsPtr;
};