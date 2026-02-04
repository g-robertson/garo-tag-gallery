/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { Z_USER_LOCAL_METRIC_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localMetricServiceID = Z_USER_LOCAL_METRIC_SERVICE_ID.safeParse(req?.body?.localMetricServiceID, {path: "localMetricServiceID"});
    if (!localMetricServiceID.success) return localMetricServiceID.error.message;
    const serviceName = z.string().nonempty().max(200).safeParse(req?.body?.serviceName, {path: "serviceName"});
    if (!serviceName.success) return serviceName.error.message;

    return {
        localMetricServiceID: localMetricServiceID.data,
        serviceName: serviceName.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.UPDATE_LOCAL_METRIC_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalMetricServices.update(dbs, req.body.localMetricServiceID, req.body.serviceName);
    res.status(200).send("Local metric service updated");
}
