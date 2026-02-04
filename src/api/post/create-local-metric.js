/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 * @import {PreInsertLocalMetric} from "../../db/metrics.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { LocalMetrics } from "../../db/metrics.js";
import { Z_METRIC_PRECISION, Z_METRIC_VALUE, Z_USER_LOCAL_METRIC_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localMetricServiceID = Z_USER_LOCAL_METRIC_SERVICE_ID.safeParse(req?.body?.localMetricServiceID, {path: ["localMetricServiceID"]});
    if (!localMetricServiceID.success) return localMetricServiceID.error.message;
    const Local_Metric_Name = z.string().nonempty().max(200).safeParse(req?.body?.metricName, {path: ["metricName"]});
    if (!Local_Metric_Name.success) return Local_Metric_Name.error.message;
    const Local_Metric_Lower_Bound = Z_METRIC_VALUE.safeParse(req?.body?.lowerBound, {path: ["lowerBound"]});
    if (!Local_Metric_Lower_Bound.success) return Local_Metric_Lower_Bound.error.message;
    const Local_Metric_Upper_Bound = Z_METRIC_VALUE.safeParse(req?.body?.upperBound, {path: ["upperBound"]});
    if (!Local_Metric_Upper_Bound.success) return Local_Metric_Upper_Bound.error.message;
    const Local_Metric_Precision = Z_METRIC_PRECISION.safeParse(req?.body?.precision, {path: ["precision"]});
    if (!Local_Metric_Precision.success) return Local_Metric_Precision.error.message;
    const Local_Metric_Type = z.coerce.number().gte(0).max(3).int().safeParse(req?.body?.metricType, {path: ["metricType"]});
    if (!Local_Metric_Type.success) return Local_Metric_Type.error.message;

    /** @type {PreInsertLocalMetric} */
    const preInsertLocalMetric = {
        Local_Metric_Name: Local_Metric_Name.data,
        Local_Metric_Lower_Bound: Local_Metric_Lower_Bound.data,
        Local_Metric_Upper_Bound: Local_Metric_Upper_Bound.data,
        Local_Metric_Precision: Local_Metric_Precision.data,
        Local_Metric_Type: Local_Metric_Type.data
    };


    return {
        localMetricServiceID: localMetricServiceID.data,
        preInsertLocalMetric
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.LOCAL_METRIC_SERVICES.CREATE_METRIC],
        objects: {
            Local_Metric_Service_IDs: [req.body.localMetricServiceID]
        }
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalMetrics.insert(dbs, req.body.preInsertLocalMetric, req.body.localMetricServiceID);
    res.status(200).send("Local metric created");
}
