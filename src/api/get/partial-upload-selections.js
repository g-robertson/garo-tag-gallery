import {readdirSync} from "fs";

/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { NOT_A_PARTIAL_UPLOAD } from "../client-get/partial-upload-selections.js";

export async function validate(dbs, req, res) {}

export const PERMISSIONS_REQUIRED = PERMISSIONS.NONE;
export async function checkPermission(dbs, req, res) {
    return true;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    res.send([NOT_A_PARTIAL_UPLOAD, ...readdirSync("./partial-zips")]);
}
