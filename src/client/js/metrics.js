import { createSystemTag, mapLookupNameToPreInsertSystemTag, SYSTEM_GENERATED } from "./tags.js";

export const METRIC_TYPES = /** @type {const} */ ({
    NUMERIC: 0,
    INCDEC: 1,
    STARS: 2
});

/** @import {DBLocalMetric, PreInsertAppliedMetric, PreInsertLocalMetric} from "../../db/metrics.js" */

/**
 * @param {PreInsertAppliedMetric} preInsertAppliedMetric
 */
export function createAppliedMetricLookupName(preInsertAppliedMetric) {
    return `system:applied metric:${preInsertAppliedMetric.Applied_Value} on ${preInsertAppliedMetric.Local_Metric_ID} with user ${preInsertAppliedMetric.User_ID ?? "SYS"}`;
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

/**
 * 
 * @param {string} name 
 */
export function mapNameToPositiveIntegerPreInsertSystemMetric(name) {
    return {
        Local_Metric_Name: name,
        Local_Metric_Lower_Bound: 0,
        Local_Metric_Upper_Bound: Number.MAX_SAFE_INTEGER,
        Local_Metric_Precision: 0,
        Local_Metric_Type: 0
    };
}


/**
 * 
 * @param {string} name 
 */
export function mapNameToPositivePreInsertSystemMetric(name) {
    return {
        Local_Metric_Name: name,
        Local_Metric_Lower_Bound: 0,
        Local_Metric_Upper_Bound: null,
        Local_Metric_Precision: 0,
        Local_Metric_Type: 0
    };
}

/**
 * @param {number} Local_Metric_ID
 * @param {bigint} Has_Local_Metric_Tag_ID
 * @param {PreInsertLocalMetric} preInsertLocalMetric
 */
export function createSystemMetric(Local_Metric_ID, Has_Local_Metric_Tag_ID, preInsertLocalMetric) {
    return Object.freeze({
        Local_Metric_ID,
        Has_Local_Metric_Tag: createSystemTag(Has_Local_Metric_Tag_ID, mapLookupNameToPreInsertSystemTag(createLocalMetricLookupName(Local_Metric_ID))),
        ...preInsertLocalMetric,
    });
}

/**
 * @param {DBLocalMetric} dbLocalMetric
 * @param {number} Applied_Value 
 */
export function createSystemAppliedMetric(dbLocalMetric, Applied_Value) {
    return {
        Local_Metric_ID: dbLocalMetric.Local_Metric_ID,
        Applied_Value
    };
}