/**
 * @import {APIFunction, APIGetPermissionsFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { FileComparisons } from "../../db/duplicates.js";

const Z_GENERIC_FILE_RELATION = z.object({
    File_ID_1: z.number(),
    File_ID_2: z.number()
}).refine(
    obj => obj.File_ID_1 !== obj.File_ID_2,
    {
        message: "File_ID_1 cannot be the same as File_ID_2",
        path: ["File_ID_1", "File_ID_2"]
    }
)

const Z_CURRENT_IS_BETTER = Z_GENERIC_FILE_RELATION.and(z.object({
    type: z.literal("current-is-better").or(z.literal("current-is-better-trash-worse")),
    Better_File_ID: z.number()
})).refine(obj => {
    return obj.Better_File_ID === obj.File_ID_1 || obj.Better_File_ID === obj.File_ID_2;
}, {
    message: "Better_File_ID must be the same as either File_ID_1 or File_ID_2",
    path: ["Better_File_ID"]
});

const Z_SAME_QUALITY = Z_GENERIC_FILE_RELATION.and(z.object({
    type: z.literal("same-quality").or(z.literal("same-quality-trash-larger")),
}));

const Z_ALTERNATES = Z_GENERIC_FILE_RELATION.and(z.object({
    type: z.literal("alternates")
}));

const Z_FALSE_POSITIVES = Z_GENERIC_FILE_RELATION.and(z.object({
    type: z.literal("false-positives")
}));

const Z_DUPLICATE_FILE_RELATION = Z_CURRENT_IS_BETTER
    .or(Z_SAME_QUALITY)
    .or(Z_ALTERNATES)
    .or(Z_FALSE_POSITIVES);
/** @typedef {z.infer<typeof Z_DUPLICATE_FILE_RELATION} DuplicateFileRelation */

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const duplicateFileRelations = z.array(Z_DUPLICATE_FILE_RELATION).safeParse(req?.body?.duplicateFileRelations, {path: ["duplicateFileRelations"]});
    if (!duplicateFileRelations.success) return duplicateFileRelations.error.message;

    return {
        duplicateFileRelations: duplicateFileRelations.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    /** @type {Set<number>} */
    const File_IDs = new Set();
    for (const duplicateFileRelation of req.body.duplicateFileRelations) {
        File_IDs.add(duplicateFileRelation.File_ID_1);
        File_IDs.add(duplicateFileRelation.File_ID_2);
    }

    return {
        permissions: [PERMISSIONS.LOCAL_TAGGABLE_SERVICES.UPDATE_TAGGABLES],
        objects: {
            File_IDs
        }
    };
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const fileComparisons = await FileComparisons.selectManyByFileIDs(dbs, req.body.fileIDs, req.body.maxPerceptualHashDistance);
    return res.status(200).send(JSON.stringify(fileComparisons));
}
