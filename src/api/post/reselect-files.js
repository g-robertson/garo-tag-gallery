/**
 * @import {APIFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { getCursorAsFileIDs, getCursorAsFileWantedFields, Z_WANTED_FILE_FIELD, Z_WANTED_TAGGABLE_FIELD } from "../../db/cursor-manager.js";
import { LocalFiles } from "../../db/taggables.js";
import { clientjsonStringify } from "../../client/js/client-util.js";


const Z_WANTED_FIELD = Z_WANTED_TAGGABLE_FIELD
.or(Z_WANTED_FILE_FIELD);
/** @typedef {z.infer<typeof Z_WANTED_FIELD>} ReselectFilesWantedField */

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const fileCursorID = z.string().or(z.undefined()).safeParse(req?.body?.fileCursor, {path: ["fileCursor"]});
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

export const PERMISSIONS_REQUIRED = {
    TYPE: PERMISSIONS.NONE,
    BITS: PERMISSION_BITS.NONE
};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    return true;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    req.body.fileCursor.setValue(LocalFiles.dedupeLocalFilesTaggables(await LocalFiles.selectManyByFileIDs(dbs, getCursorAsFileIDs(req.body.fileCursor))));

    return res.status(200).send(clientjsonStringify(getCursorAsFileWantedFields(req.body.fileCursor, req.body.wantedFields)));
}
