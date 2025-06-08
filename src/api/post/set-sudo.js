/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";

export const PERMISSIONS_REQUIRED = [PERMISSIONS.IS_ADMIN];
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    res.cookie("sudo", req.body.sudo);
    res.status(200).send("Set sudo status");
}
