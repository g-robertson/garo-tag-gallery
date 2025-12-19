/**
 * @import {APIFunction, APIValidationFunction} from "../api-types.js"
 */

import { mkdir, rename } from "fs/promises";
import { PERMISSIONS } from "../../client/js/user.js";
import { rootedPath } from "../../util.js";
import path from "path";
import { z } from "zod";
import { PARTIAL_ZIPS_FOLDER } from "../../db/db-util.js";
import { getCursorAsPath } from "../../db/cursor-manager.js";
import { NOT_A_PARTIAL_UPLOAD } from "../client-get/non-partial-upload-cursor.js";

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const partialUploadSelection = z.string().nonempty().max(127).safeParse(req?.body?.partialUploadSelection, {path: ["partialUploadSelection"]});
    if (!partialUploadSelection.success) return partialUploadSelection.error.message;
    const pathCursorID = z.string().or(z.undefined()).safeParse(req?.body?.pathCursorID, {path: ["pathCursorID"]});
    if (!pathCursorID.success) return pathCursorID.error.message;

    if (req?.files?.length !== 1) {
        return "More than one file is not allowed to be uploaded at a time";
    }
    /** @type {Express.Multer.File} */
    const file = req.files[0];
    let folderSafePath = "";
    let fileSafePath = "";

    if (partialUploadSelection.data === NOT_A_PARTIAL_UPLOAD) {
        folderSafePath = getCursorAsPath(dbs.cursorManager.getCursorForUser(req.user.id(), pathCursorID.data));
        if (folderSafePath === undefined) {
            return "Path cursor did not exist";
        }

        const uploadFileRootedPath = rootedPath(folderSafePath, path.join(folderSafePath, file.originalname));
        if (!uploadFileRootedPath.isRooted) {
            return "File path was not rooted in path cursor path";
        }
        fileSafePath = uploadFileRootedPath.safePath;
    } else {
        const partialUploadFolderRootedPath = rootedPath(PARTIAL_ZIPS_FOLDER, path.join(PARTIAL_ZIPS_FOLDER, partialUploadSelection.data));
        if (!partialUploadFolderRootedPath.isRooted) {
            return "Partial upload folder was not rooted in partial-zips";
        }
        folderSafePath = partialUploadFolderRootedPath.safePath;

        const partialUploadFileRootedPath = rootedPath(folderSafePath, path.join(folderSafePath, file.originalname));
        if (!partialUploadFileRootedPath.isRooted) {
            return "Partial upload file path was not rooted in folder path";
        }
        fileSafePath = partialUploadFileRootedPath.safePath;
    }

    return {
        folderSafePath,
        fileSafePath,
        file
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.NONE, BITS: 0};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission() {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await mkdir(req.body.folderSafePath, {recursive: true});
    await rename(req.body.file.path, req.body.fileSafePath);

    res.status(200).send("Finished posting file");
}
