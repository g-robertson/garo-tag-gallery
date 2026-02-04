/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { LocalMetrics } from "../../db/metrics.js";
import { Z_USER_LOCAL_METRIC_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localMetricID = Z_USER_LOCAL_METRIC_ID.safeParse(req?.body?.localMetricID, {path: "localMetricID"});
    if (!localMetricID.success) return localMetricID.error.message;

    return {
        localMetricID: localMetricID.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.LOCAL_METRIC_SERVICES.DELETE_METRIC],
        objects: {
            Local_Metric_IDs: [req.body.localMetricID]
        }
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalMetrics.deleteByID(dbs, req.body.localMetricID);
    res.status(200).send("Local metric deleted");
}
