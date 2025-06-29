/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalMetrics, LocalMetricServices } from "../../db/metrics.js";

export async function validate(dbs, req, res) {
    const localMetricID = z.number().nonnegative().safeParse(req?.body?.localMetricID, {path: "localMetricID"});
    if (!localMetricID.success) return localMetricID.error.message;

    return {
        localMetricID: localMetricID.data
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.LOCAL_METRIC_SERVICES, BITS: PERMISSION_BITS.DELETE};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localMetricServiceIDToCheck = await LocalMetricServices.selectByLocalMetricID(dbs, req.body.localMetricID);
    const localMetricService = await LocalMetricServices.userSelectByID(dbs, req.user, PERMISSION_BITS.DELETE, localMetricServiceIDToCheck);
    return localMetricService !== undefined;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalMetrics.deleteByID(dbs, req.body.localMetricID);
    res.status(200).send("Local metric deleted");
}
