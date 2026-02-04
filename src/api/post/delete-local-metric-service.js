/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { Z_USER_LOCAL_METRIC_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localMetricServiceID = Z_USER_LOCAL_METRIC_SERVICE_ID.safeParse(req?.body?.localMetricServiceID, {path: "localMetricServiceID"});
    if (!localMetricServiceID.success) return localMetricServiceID.error.message;

    return {
        localMetricServiceID: localMetricServiceID.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.DELETE_LOCAL_METRIC_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalMetricServices.deleteByID(dbs, req.body.localMetricServiceID);
    res.status(200).send("Local metric service deleted");
}
