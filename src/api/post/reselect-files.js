/**
 * @import {APIFunction, APIGetPermissionsFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { getCursorAsFileIDs, getCursorAsFileWantedFields } from "../../db/cursor-manager.js";
import { LocalFiles } from "../../db/taggables.js";
import { clientjsonStringify } from "../../client/js/client-util.js";
import { Z_WANTED_FIELD } from "../zod-types.js";

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const fileCursorID = z.optional(z.string()).safeParse(req?.body?.fileCursor, {path: ["fileCursor"]});
    if (!fileCursorID.success) return fileCursorID.error.message;
    const wantedFields = Z_WANTED_FIELD.or(z.array(Z_WANTED_FIELD)).safeParse(req?.body?.wantedFields, {path: ["wantedFields"]});
    if (!wantedFields.success) return wantedFields.error.message;

    const fileCursor = dbs.cursorManager.getCursorForUser(req.user.id(), fileCursorID.data);
    if (fileCursor?.type !== "File") {
        return "Cursor was not of type 'File'";
    }


    return {
        fileCursor: fileCursor,
        wantedFields: wantedFields.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    req.body.fileCursor.setValue(LocalFiles.groupLocalFilesTaggables(await LocalFiles.selectManyByFileIDs(dbs, getCursorAsFileIDs(req.body.fileCursor))));

    return res.status(200).send(clientjsonStringify(getCursorAsFileWantedFields(req.body.fileCursor, req.body.wantedFields)));
}
