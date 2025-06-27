export const METRIC_TYPES = {
    NUMERIC: 0,
    INCDEC: 1,
    STARS: 2
};

/** @import {PreInsertAppliedMetric} from "../../db/metrics.js" */

/**
 * @param {PreInsertAppliedMetric} preInsertAppliedMetric
 */
export function createAppliedMetricLookupName(preInsertAppliedMetric) {
    return `system:applied metric:${preInsertAppliedMetric.Applied_Value} on ${preInsertAppliedMetric.Local_Metric_ID} with user ${preInsertAppliedMetric.User_ID}`;
}

/**
 * @param {string} lookupName 
 */
export function isAppliedMetricLookupName(lookupName) {
    return lookupName.startsWith("system:applied metric:");
}

/**
 * @param {string} lookupName 
 */
export function revertAppliedMetricLookupName(lookupName) {
    const parts1 = lookupName.slice("system:applied metric:".length).split(' on ');
    const parts2 = parts1[1].split(' with user ');
    return {
        Applied_Value: Number(parts1[0]),
        Local_Metric_ID: Number(parts2[0]),
        User_ID: Number(parts2[1])
    };
}

/**
 * @param {number} localMetricServiceID 
 */
export function createInLocalMetricServiceLookupName(localMetricServiceID) {
    return `system:has metric from local metric service:${localMetricServiceID}`
}


/**
 * @param {number} localMetricID 
 */
export function createLocalMetricLookupName(localMetricID) {
    return `system:has local metric:${localMetricID}`;
}

/**
 * @param {string} localMetricName 
 * @param {string} userName 
 * @param {number} appliedValue 
 */
export function createAppliedMetricDisplayName(localMetricName, userName, appliedValue) {
    return `system:applied metric:${appliedValue} on ${localMetricName} with user ${userName}`;
}