/**
 * @import {APIFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { getCursorAsFileIDs } from "../../db/cursor-manager.js";
import { FileComparisons } from "../../db/duplicates.js";
import { USER_PERCEPTUAL_HASH_MULTIPLIER } from "../../client/js/duplicates.js";

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const fileCursorID = z.string().or(z.undefined()).safeParse(req?.body?.fileCursor, {path: ["fileCursor"]});
    if (!fileCursorID.success) return fileCursorID.error.message;
    const maxPerceptualHashDistance = z.number().safeParse(req?.body?.maxPerceptualHashDistance, {path: ["maxPerceptualHashDistance"]});
    if (!maxPerceptualHashDistance.success) return maxPerceptualHashDistance.error.message;

    const fileIDs = getCursorAsFileIDs(dbs.cursorManager.getCursorForUser(req.user.id(), fileCursorID.data));
    if (fileIDs === undefined) {
        return "No file cursor found for user";
    }

    return {
        fileIDs,
        maxPerceptualHashDistance: maxPerceptualHashDistance.data / USER_PERCEPTUAL_HASH_MULTIPLIER
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
    const fileComparisons = await FileComparisons.selectManyByFileIDs(dbs, req.body.fileIDs, req.body.maxPerceptualHashDistance);
    return res.status(200).send(JSON.stringify(fileComparisons));
}
