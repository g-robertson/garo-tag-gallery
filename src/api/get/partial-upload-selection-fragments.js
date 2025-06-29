/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import path from "path";
import { rootedPath } from "../../util.js";
import { z } from "zod";
import { readdir } from "fs/promises";
import { PARTIAL_ZIPS_FOLDER } from "../../db/db-util.js";

export async function validate(dbs, req, res) {
    const partialUploadFolder = z.string().nonempty().max(40).safeParse(req?.query?.partialUploadFolder, {path: ["partialUploadFolder"]});
    if (!partialUploadFolder.success) return partialUploadFolder.error.message;

    const partialUploadFolderRootedPath = rootedPath(PARTIAL_ZIPS_FOLDER, path.join(PARTIAL_ZIPS_FOLDER, partialUploadFolder.data));
    if (!partialUploadFolderRootedPath.isRooted) {
        return "partialUploadPath was not rooted in partial-zips";
    }

    const partialUploadFolderSafePath = partialUploadFolderRootedPath.safePath;
    return {
        partialUploadFolderSafePath
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.NONE, BITS: 0};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    return false;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    let dirContents = [];
    try {
        dirContents = await readdir(req.body.partialUploadFolderSafePath);
    } catch (err) {} // Nothing we can do about a non-existent directory
    res.send(dirContents);
}
