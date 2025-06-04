/**
 * @import {APIFunction} from "../api-types.js"
 */

import { mkdirSync, renameSync } from "fs";
import { PERMISSIONS } from "../../client/js/user.js";
import { rootedPath } from "../../util.js";
import path from "path";

export const PERMISSIONS_REQUIRED = [PERMISSIONS.NONE];
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    const partialUploadFolder = req.body.partialUploadSelection;
    if (partialUploadFolder === undefined) {
        return res.redirect("/400");
    }
    
    if (req.files.length > 1) {
        return res.redirect("/400");
    }

    const partialUploadRootedPath = rootedPath("./partial-zips", path.join("./partial-zips", partialUploadFolder));
    if (!partialUploadRootedPath.isRooted) {
        return res.redirect("/400");
    }

    const partialUploadPath = partialUploadRootedPath.safePath;
    
    const file = req.files[0];
    const partialUploadFilePath = rootedPath("./partial-zips", path.join(partialUploadPath, file.originalname));
    if (!partialUploadFilePath.isRooted) {
        return res.redirect("/400");
    }

    mkdirSync(partialUploadPath, {recursive: true});
    renameSync(file.path, partialUploadFilePath.safePath);

    res.status(200).send("Finished posting file");
}
