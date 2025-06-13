/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { userCreateLocalMetricService } from "../../db/metrics.js";

export async function validate(dbs, req, res) {
    const serviceName = req?.body?.serviceName;
    if (typeof serviceName !== "string") {
        return "Service name must be a string";
    }
    if (serviceName.length > 200) {
        return "Service name cannot be over 200 characters";
    }

    req.sanitizedBody = {
        serviceName
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.NONE];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.CREATE;
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    await userCreateLocalMetricService(dbs, req.user, req.sanitizedBody.serviceName);
    res.status(200).send("Metric service created");
}
