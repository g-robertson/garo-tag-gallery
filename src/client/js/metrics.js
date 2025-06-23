export const METRIC_TYPES = {
    NUMERIC: 0,
    INCDEC: 1,
    STARS: 2
};

/**
 * @param {number} localMetricID 
 * @param {number} userID 
 * @param {number} appliedValue 
 */
export function createAppliedMetricLookupName(localMetricID, userID, appliedValue) {
    return `system:applied metric:${appliedValue} on ${localMetricID} with user ${userID}`;
}

/**
 * @param {string} localMetricName 
 * @param {string} userName 
 * @param {number} appliedValue 
 */
export function createAppliedMetricDisplayName(localMetricName, userName, appliedValue) {
    return `system:applied metric:${appliedValue} on ${localMetricName} with user ${userName}`;
}