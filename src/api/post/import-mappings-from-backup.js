import {readFile, rm} from "fs/promises";

/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { abjsonParse } from "../../client/js/client-util.js";
import { importMappingsFromBackupJob } from "../../db/import.js";

export async function validate(dbs, req, res) {
    if (req?.files?.length !== 1) {
        return "Only one file is allowed to be uploaded at a time";
    }
    /** @type {Express.Multer.File} */
    const file = req.files[0];
    
    return {
        file
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [
            PERMISSIONS.ADMINISTRATIVE.IMPORT
        ],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    const fileContents = (await readFile(req.body.file.path)).toString();
    await rm(req.body.file.path);
    const mappings = abjsonParse(fileContents);
    dbs.jobManager.addJobToRunner(req.user.id(), importMappingsFromBackupJob(
        dbs,
        mappings,
        req.user.id()
    ));
    res.status(200).send("Finished posting file");
}
