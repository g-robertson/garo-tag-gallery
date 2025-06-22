/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { NOT_A_PARTIAL_UPLOAD } from "../client-get/partial-upload-selections.js";
import { readdir } from "fs/promises";

export async function validate(dbs, req, res) {}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.NONE, BITS: 0};
export async function checkPermission(dbs, req, res) {
    return false;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    res.send([NOT_A_PARTIAL_UPLOAD, ...(await readdir("./partial-zips"))]);
}
