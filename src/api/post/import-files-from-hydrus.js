/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { importFilesFromHydrus } from "../../db/import.js";

export const PERMISSIONS_REQUIRED = [PERMISSIONS.LOCAL_FILE_SERVICES, PERMISSIONS.LOCAL_TAG_SERVICES];
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    if (req.partialUploadPath === undefined || req.partialFilePaths === undefined) {
        return res.redirect("/400");
    }
    
    const err = importFilesFromHydrus(dbs, req.partialUploadPath, req.partialFilePaths);
    if (err !== undefined) {
        res.status(200).send("Finished retrieving file");
    } else {
        res.status(400).send(err);
    }
}
