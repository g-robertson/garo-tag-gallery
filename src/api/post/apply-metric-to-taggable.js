/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { AppliedMetrics } from "../../db/metrics.js";
import { Z_DATABASE_ID, Z_METRIC_VALUE, Z_TAGGABLE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const taggableID = Z_TAGGABLE_ID.safeParse(req?.body?.taggableID, {path: ["taggableID"]});
    if (!taggableID.success) return taggableID.error.message;

    const localMetricID = Z_DATABASE_ID.safeParse(req?.body?.localMetricID, {path: ["localMetricID"]});
    if (!localMetricID.success) return localMetricID.error.message;

    const metricValue = Z_METRIC_VALUE.safeParse(req?.body?.metricValue, {path: ["metricValue"]});
    if (!metricValue.success) return metricValue.error.message;

    return {
        taggableID: taggableID.data,
        localMetricID: localMetricID.data,
        metricValue: metricValue.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [
            PERMISSIONS.LOCAL_METRIC_SERVICES.APPLY_METRIC,
            PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES
        ],
        objects: {
            Local_Metric_IDs: [req.body.localMetricID],
            Taggable_IDs: [req.body.taggableID]
        }
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    const appliedMetric = await AppliedMetrics.tagMap(dbs, await AppliedMetrics.uniqueInsert(dbs, {
        Local_Metric_ID: req.body.localMetricID,
        User_ID: req.user.id(),
        Applied_Value: req.body.metricValue
    }));
    await AppliedMetrics.applyToTaggable(
        dbs,
        req.body.taggableID,
        appliedMetric
    );
    res.status(200).send("Tag to metric done");
}
