/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";

export async function validate(dbs, req, res) {
    const sudo = z.coerce.boolean().safeParse(req?.body?.sudo, {path: ["sudo"]});
    if (!sudo.success) return sudo.error.message;

    req.sanitizedBody = {
        sudo
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.IS_ADMIN, BITS: PERMISSION_BITS.ALL};
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    res.cookie("sudo", req.sanitizedBody.sudo);
    res.status(200).send("Set sudo status");
}
