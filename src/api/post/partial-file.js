/**
 * @import {APIFunction} from "../api-types.js"
 */

import { mkdirSync, renameSync } from "fs";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { rootedPath } from "../../util.js";
import path from "path";

export async function validate(dbs, req, res) {
    const partialUploadFolder = req?.body?.partialUploadSelection;
    if (typeof partialUploadFolder !== "string") {
        return "partialUploadSelection was not a string";
    }
    if (req?.files?.length > 1) {
        return "More than one file is not allowed to be uploaded at a time";
    }

    const partialUploadFolderRootedPath = rootedPath("./partial-zips", path.join("./partial-zips", partialUploadFolder));
    if (!partialUploadFolderRootedPath.isRooted) {
        return "Partial upload folder was not rooted in partial-zips";
    }
    const partialUploadFolderSafePath = partialUploadFolderRootedPath.safePath;
    const partialUploadFileRootedPath = rootedPath("./partial-zips", path.join(partialUploadFolderSafePath, file.originalname));
    
    if (!partialUploadFileRootedPath.isRooted) {
        return "Partial upload file path was not rooted in partial-zips";
    }
    const partialUploadFileSafePath = partialUploadFileRootedPath.safePath;
    const file = req.files[0];

    req.sanitizedBody = {
        partialUploadFolderSafePath,
        partialUploadFileSafePath,
        file
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.NONE];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.UPDATE;
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    mkdirSync(req.sanitizedBody.partialUploadFolderSafePath, {recursive: true});
    renameSync(req.sanitizedBody.file.path, req.sanitizedBody.partialUploadFileSafePath);

    res.status(200).send("Finished posting file");
}
