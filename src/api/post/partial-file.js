/**
 * @import {APIFunction} from "../api-types.js"
 */

import { mkdir, rename } from "fs/promises";
import { PERMISSIONS } from "../../client/js/user.js";
import { rootedPath } from "../../util.js";
import path from "path";
import { z } from "zod";

export async function validate(dbs, req, res) {
    const partialUploadSelection = z.string().nonempty().max(120).safeParse(req?.body?.partialUploadSelection, {path: ["partialUploadSelection"]});
    if (!partialUploadSelection.success) return partialUploadSelection.error.message;
    if (req?.files?.length > 1) {
        return "More than one file is not allowed to be uploaded at a time";
    }
    /** @type {Express.Multer.File} */
    const file = req.files[0];

    const partialUploadFolderRootedPath = rootedPath("./partial-zips", path.join("./partial-zips", partialUploadSelection.data));
    if (!partialUploadFolderRootedPath.isRooted) {
        return "Partial upload folder was not rooted in partial-zips";
    }
    const partialUploadFolderSafePath = partialUploadFolderRootedPath.safePath;

    const partialUploadFileRootedPath = rootedPath("./partial-zips", path.join(partialUploadFolderSafePath, file.originalname));
    if (!partialUploadFileRootedPath.isRooted) {
        return "Partial upload file path was not rooted in partial-zips";
    }
    const partialUploadFileSafePath = partialUploadFileRootedPath.safePath;

    return {
        partialUploadFolderSafePath,
        partialUploadFileSafePath,
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
    await mkdir(req.body.partialUploadFolderSafePath, {recursive: true});
    await rename(req.body.file.path, req.body.partialUploadFileSafePath);

    res.status(200).send("Finished posting file");
}
