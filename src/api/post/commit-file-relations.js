/**
 * @import {APIFunction, APIGetPermissionsFunction, APIValidationFunction} from "../api-types.js"
 * @import {PreInsertBetterDuplicateFileRelation, PreInsertTransitiveFileRelation, PreInsertNontransitiveFileRelation} from "../../db/duplicates.js"
 */

import { z } from "zod";
import { PERMISSIONS, SYSTEM_USER_ID } from "../../client/js/user.js";
import { BetterDuplicateFileRelations, NontransitiveFileRelations, TransitiveFileRelations } from "../../db/duplicates.js";
import { getFileRelationsFiles, NONTRANSITIVE_FILE_RELATION_TYPES, TRANSITIVE_FILE_RELATION_TYPES } from "../../client/js/duplicates.js";
import { TaggableFiles, Taggables } from "../../db/taggables.js";
import { AppliedMetrics } from "../../db/metrics.js";
import { FILE_SIZE_METRIC } from "../../client/js/defaults.js";
import { Z_FILE_RELATION } from "../zod-types.js";

/** @import {FileRelation} from "../zod-types.js" */


/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const fileRelations = z.array(Z_FILE_RELATION).safeParse(req?.body?.fileRelations, {path: ["fileRelations"]});
    if (!fileRelations.success) return fileRelations.error.message;

    return {
        fileRelations: fileRelations.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    const permissions = [PERMISSIONS.LOCAL_TAGGABLE_SERVICES.UPDATE_TAGGABLES];

    /** @type {Set<number>} */
    const fileIDs = new Set();
    
    if (req.body.fileRelations.some(fileRelation => fileRelation.type === "duplicates-with-better-trash-worse" || fileRelation.type === "duplicates-with-same-quality-trash-larger")) {
        permissions.push(PERMISSIONS.LOCAL_TAGGABLE_SERVICES.TRASH_TAGGABLES);
    }
    for (const fileRelation of req.body.fileRelations) {
        for (const fileID of getFileRelationsFiles(fileRelation)) {
            fileIDs.add(fileID);
        }
    }

    return {
        permissions,
        objects: {
            File_IDs: [...fileIDs]
        }
    };
}

/**
 * @param {FileRelation[]} clientFileRelations 
 */
async function transformClientFileRelationsToDatabaseObjects(dbs, clientFileRelations) {
    /** @type {PreInsertBetterDuplicateFileRelation[]} */
    const betterDuplicateFileRelations = [];
    /** @type {PreInsertTransitiveFileRelation[]} */
    const transitiveFileRelations = [];
    /** @type {PreInsertNontransitiveFileRelation[]} */
    const nontransitiveFileRelations = [];
    /** @type {number[]} */
    const worseFileIDsToTrash = [];
    /** @type {[number, number][]} */
    const fileIDsToTrashLarger = [];
    for (const clientFileRelation of clientFileRelations) {
        if (clientFileRelation.type === "duplicates-with-better" || clientFileRelation.type === "duplicates-with-better-trash-worse") {
            betterDuplicateFileRelations.push(clientFileRelation);
            transitiveFileRelations.push({
                File_ID_1: clientFileRelation.Better_File_ID,
                File_ID_2: clientFileRelation.Worse_File_ID,
                File_Relation_Type: TRANSITIVE_FILE_RELATION_TYPES.DUPLICATES
            });
        } else if (clientFileRelation.type === "duplicates-with-same-quality" || clientFileRelation.type === "duplicates-with-same-quality-trash-larger") {
            transitiveFileRelations.push({
                ...clientFileRelation,
                File_Relation_Type: TRANSITIVE_FILE_RELATION_TYPES.DUPLICATES
            });
        } else if (clientFileRelation.type === "alternates") {
            transitiveFileRelations.push({
                ...clientFileRelation,
                File_Relation_Type: TRANSITIVE_FILE_RELATION_TYPES.ALTERNATES
            });
            nontransitiveFileRelations.push({
                ...clientFileRelation,
                File_Relation_Type: NONTRANSITIVE_FILE_RELATION_TYPES.ALTERNATES
            });
        } else if (clientFileRelation.type === "false-positives") {
            nontransitiveFileRelations.push({
                ...clientFileRelation,
                File_Relation_Type: NONTRANSITIVE_FILE_RELATION_TYPES.FALSE_POSITIVES
            });
        } else if (clientFileRelation.type === "implied") {
        } else {
            throw `Unexpected file relation type found: ${clientFileRelation.type}`
        }

        if (clientFileRelation.type === "duplicates-with-better-trash-worse") {
            worseFileIDsToTrash.push(clientFileRelation.Worse_File_ID);
        } else if (clientFileRelation.type === "duplicates-with-same-quality-trash-larger") {
            fileIDsToTrashLarger.push([clientFileRelation.File_ID_1, clientFileRelation.File_ID_2]);
        }
    }

    const taggableIDsToTrash = TaggableFiles.groupTaggableFilesTaggables(await TaggableFiles.selectManyByFileIDs(dbs, worseFileIDsToTrash)).flatMap(taggableFile => taggableFile.Taggable_IDs);

    const fileIDsToTaggableIDsToTrashLargerMap = new Map(TaggableFiles.groupTaggableFilesTaggables(await TaggableFiles.selectManyByFileIDs(dbs, fileIDsToTrashLarger.flat())).map(taggableFile =>
        [taggableFile.File_ID, taggableFile.Taggable_IDs]
    ));
    const taggableIDsToSize = await AppliedMetrics.userSelectMappedByTaggableIDsByLocalMetricID(dbs, SYSTEM_USER_ID, FILE_SIZE_METRIC.Local_Metric_ID, [...fileIDsToTaggableIDsToTrashLargerMap.values()].flat());

    for (const [fileID1, fileID2] of fileIDsToTrashLarger) {
        const fileID1Taggables = fileIDsToTaggableIDsToTrashLargerMap.get(fileID1);
        const fileID2Taggables = fileIDsToTaggableIDsToTrashLargerMap.get(fileID2);
        if (taggableIDsToSize.get(fileID1Taggables[0]).Applied_Value > taggableIDsToSize.get(fileID2Taggables[0]).Applied_Value) {
            taggableIDsToTrash.push(...fileID1Taggables);
        } else {
            taggableIDsToTrash.push(...fileID2Taggables);
        }
    }

    return {
        betterDuplicateFileRelations,
        transitiveFileRelations,
        nontransitiveFileRelations,
        taggableIDsToTrash
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const {betterDuplicateFileRelations, transitiveFileRelations, nontransitiveFileRelations, taggableIDsToTrash} = await transformClientFileRelationsToDatabaseObjects(dbs, req.body.fileRelations);

    await BetterDuplicateFileRelations.uniqueInsertMany(dbs, betterDuplicateFileRelations);
    await TransitiveFileRelations.uniqueInsertMany(dbs, transitiveFileRelations);
    await NontransitiveFileRelations.uniqueInsertMany(dbs, nontransitiveFileRelations);
    await Taggables.trashManyByIDs(dbs, taggableIDsToTrash);
    return res.status(200).send("File relations posted");
}
