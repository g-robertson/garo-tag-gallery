import {readdirSync} from "fs";

/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import path from "path";
import { rootedPath } from "../../util.js";

export async function validate(dbs, req, res) {
    const partialUploadFolder = req?.query?.partialUploadPath;
    if (typeof partialUploadFolder !== "string") {
        return "partialUploadPath was not a string";
    }
    const partialUploadFolderRootedPath = rootedPath("./partial-zips", path.join("./partial-zips", partialUploadFolder));
    if (!partialUploadFolderRootedPath.isRooted) {
        return "partialUploadPath was not rooted in partial-zips";
    }

    const partialUploadFolderSafePath = partialUploadFolderRootedPath.safePath;
    req.sanitizedBody = {
        partialUploadFolderSafePath
    };
}

export const PERMISSIONS_REQUIRED = PERMISSIONS.NONE;
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.READ;
export async function checkPermission(dbs, req, res) {
    return false;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    let dirContents = [];
    try {
        dirContents = readdirSync(req.sanitizedBody.partialUploadFolderSafePath);
    } catch (err) {} // Nothing we can do about a non-existent directory
    res.send(dirContents);
}
