/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PARTIAL_ZIPS_FOLDER } from "../../db/db-util.js";
import { readdir } from "fs/promises";
import { NOT_A_PARTIAL_UPLOAD } from "../client-get/non-partial-upload-cursor.js";

export async function validate(dbs, req, res) {}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    res.send([NOT_A_PARTIAL_UPLOAD, ...(await readdir(PARTIAL_ZIPS_FOLDER))]);
}
