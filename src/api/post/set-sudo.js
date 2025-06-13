/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";

export async function validate(dbs, req, res) {
    const sudo = req?.body?.sudo;
    if (typeof sudo !== "boolean") {
        return "sudo was not a boolean";
    }

    req.sanitizedBody = {
        sudo
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.IS_ADMIN];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.ALL;
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    res.cookie("sudo", req.sanitizedBody.sudo);
    res.status(200).send("Set sudo status");
}
