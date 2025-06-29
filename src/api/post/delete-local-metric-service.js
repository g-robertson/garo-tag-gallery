/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";

export async function validate(dbs, req, res) {
    const localMetricServiceID = z.number().nonnegative().safeParse(req?.body?.localMetricServiceID, {path: "localMetricServiceID"});
    if (!localMetricServiceID.success) return localMetricServiceID.error.message;

    return {
        localMetricServiceID: localMetricServiceID.data
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.IS_ADMIN, BITS: PERMISSION_BITS.ALL};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission() {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalMetricServices.deleteByID(dbs, req.body.localMetricServiceID);
    res.status(200).send("Local metric service deleted");
}
