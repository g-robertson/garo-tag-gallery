/**
 * @import {APIFunction} from "../api-types.js"
 * @import {PreInsertLocalMetric} from "../../db/metrics.js"
 */

import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { createLocalMetric, userSelectLocalMetricService } from "../../db/metrics.js";

export async function validate(dbs, req, res) {
    const localMetricServiceID = Number(req?.body?.localMetricServiceID);
    if (!Number.isSafeInteger(localMetricServiceID)) {
        return "localMetricServiceID was not a number";
    }

    /** @type {PreInsertLocalMetric} */
    const preInsertLocalMetric = {
        Local_Metric_Name: req?.body?.metricName,
        Local_Metric_Lower_Bound: Number(req?.body?.lowerBound),
        Local_Metric_Upper_Bound: Number(req?.body?.upperBound),
        Local_Metric_Precision: Number(req?.body?.precision),
        Local_Metric_Type: Number(req?.body?.metricType)
    };

    if (typeof preInsertLocalMetric.Local_Metric_Name !== "string") {
        return "metricName must be a string";
    }
    if (preInsertLocalMetric.Local_Metric_Name.length === 0) {
        return "metricName must have a value";
    }
    if (preInsertLocalMetric.Local_Metric_Name.length > 200) {
        return "metricName must not be over 200 length";
    }
    if (isNaN(preInsertLocalMetric.Local_Metric_Lower_Bound)) {
        return "lowerBound must be a number";
    }
    if (isNaN(preInsertLocalMetric.Local_Metric_Upper_Bound)) {
        return "upperBound must be a number";
    }
    if (isNaN(preInsertLocalMetric.Local_Metric_Precision)) {
        return "precision must be a number";
    }
    if (isNaN(preInsertLocalMetric.Local_Metric_Type)) {
        return "metricType must be a number";
    }

    req.sanitizedBody = {
        localMetricServiceID,
        preInsertLocalMetric
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.LOCAL_METRIC_SERVICES];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.CREATE;
export async function checkPermission(dbs, req, res) {
    const localMetricServiceIDToCheck = req.sanitizedBody.localMetricServiceID;
    const localMetricService = await userSelectLocalMetricService(dbs, req.user, PERMISSION_BITS.CREATE, localMetricServiceIDToCheck);
    return localMetricService !== undefined;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    await createLocalMetric(dbs, req.sanitizedBody.preInsertLocalMetric, req.sanitizedBody.localMetricServiceID);
    res.status(200).send("Metric service created");
}
