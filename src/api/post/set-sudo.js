/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";

export async function validate(dbs, req, res) {
    const sudo = z.coerce.boolean().safeParse(req?.body?.sudo, {path: ["sudo"]});
    if (!sudo.success) return sudo.error.message;

    return {
        sudo: sudo.data
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.IS_ADMIN, BITS: PERMISSION_BITS.ALL};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission() {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    res.cookie("sudo", req.body);
    res.status(200).send("Set sudo status");
}
