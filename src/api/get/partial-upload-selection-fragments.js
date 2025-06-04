import {readdirSync} from "fs";

/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import path from "path";
import { rootedPath } from "../../util.js";

export const PERMISSIONS_REQUIRED = PERMISSIONS.NONE;
export async function checkPermission() {
    return true;
}

/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const partialUploadFolder = req?.query.partialUploadPath;
    if (typeof partialUploadFolder !== "string") {
        return res.redirect("/400");
    }
    const partialUploadPath = rootedPath("./partial-zips", path.join("./partial-zips", partialUploadFolder));
    if (!partialUploadPath.isRooted) {
        return res.redirect("/400");
    }

    let dirContents = [];
    try {
        dirContents = readdirSync(partialUploadPath.safePath);
    } catch (err) {} // Nothing we can do about a non-existent directory
    res.send(dirContents);
}
