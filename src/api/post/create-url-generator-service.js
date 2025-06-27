/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalURLGeneratorServices } from "../../db/url-generators.js";

export async function validate(dbs, req, res) {
    const serviceName = z.string().nonempty().max(200).safeParse(req?.body?.serviceName, {path: "serviceName"});
    if (!serviceName.success) return serviceName.error.message;

    return {
        serviceName: serviceName.data
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.IS_ADMIN, BITS: PERMISSION_BITS.ALL};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission() {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalURLGeneratorServices.userInsert(dbs, req.user, req.body.serviceName);
    res.status(200).send("Metric service created");
}
