/** @import {FileRelation} from "../../api/zod-types.js" */

export const CURRENT_PERCEPTUAL_HASH_VERSION = 1;
export const IS_EXACT_DUPLICATE_DISTANCE = -1;
export const USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER = 1/10;
export const DUP_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE = 0;
export const ALT_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE = 0;
export const REASONABLE_SIMILAR_PERCEPTUAL_HASH_DISTANCE = 190;
export const MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE = 220;

export const TRANSITIVE_FILE_RELATION_TYPES = /** @type {const} */ ({
    DUPLICATES: 1,
    ALTERNATES: 2
});
/** @typedef {(typeof TRANSITIVE_FILE_RELATION_TYPES)[keyof typeof TRANSITIVE_FILE_RELATION_TYPES]} TransitiveFileRelationType */

export const NONTRANSITIVE_FILE_RELATION_TYPES = /** @type {const} */ ({
    FALSE_POSITIVES: 1
});
/** @typedef {(typeof NONTRANSITIVE_FILE_RELATION_TYPES)[keyof typeof NONTRANSITIVE_FILE_RELATION_TYPES]} NontransitiveFileRelationType */

/**
 * @param {FileRelation} fileRelation 
 */
export function isFileRelationDuplicate(fileRelation) {
    const {type} = fileRelation;
    return type === "duplicates-with-better-trash-worse" || type === "duplicates-with-better" || type === "duplicates-with-same-quality" || type === "duplicates-with-same-quality-trash-larger";
}

/**
 * @param {FileRelation} fileRelation 
 */
export function getFileRelationsFiles(fileRelation) {
    const {type} = fileRelation;
    if (type === "duplicates-with-better-trash-worse" || type === "duplicates-with-better") {
        return [fileRelation.Better_File_ID, fileRelation.Worse_File_ID];
    } else if (type === "duplicates-with-same-quality" || type === "duplicates-with-same-quality-trash-larger" || type === "alternates" || type === "false-positives") {
        return [fileRelation.File_ID_1, fileRelation.File_ID_2]
    } else if (type === "implied") {
        return [];
    } else {
        throw "Unrecognized file relation type to extract file ids from";
    }
}