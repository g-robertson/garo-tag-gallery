/**
 * @import {APIFunction, APIGetPermissionsFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { getCursorAsFileIDs } from "../../db/cursor-manager.js";
import { FileComparisons } from "../../db/duplicates.js";
import { NO_FILE_CURSOR_FOUND } from "../../client/js/cursor.js";


/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    
    const fileCursor = z.optional(z.string()).safeParse(req?.body?.fileCursor, {path: ["fileCursor"]});
    if (!fileCursor.success) return fileCursor.error.message;

    const fileIDs = getCursorAsFileIDs(dbs.cursorManager.getCursorForUser(req.user.id(), fileCursor.data));
    if (fileIDs === undefined) {
        return NO_FILE_CURSOR_FOUND;
    }

    return {
        fileIDs
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.LOCAL_TAGGABLE_SERVICES.UPDATE_TAGGABLES],
        objects: {
            File_IDs: req.body.fileIDs
        }
    };
}

const COMPARE_FILES_FOR_DUPLICATES_JOB_TYPE = "compare-files-for-duplicates";

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const existingJobIndex = dbs.jobManager.getJobsForRunner(req.user.id()).findIndex(job => job.jobType() === COMPARE_FILES_FOR_DUPLICATES_JOB_TYPE);
    if (existingJobIndex !== -1) {
        return res.status(400).send("Cannot have more than one file comparison job running at once");
    }

    
    dbs.jobManager.addJobToRunner(req.user.id(), FileComparisons.compareFilesForDuplicatesJob(
        dbs,
        req.body.fileIDs
    ));

    return res.status(200).send("File comparison job started");
}
