import { mapNullCoalesce, TransitiveRelationGroups } from "../client/js/client-util.js";
import { CURRENT_PERCEPTUAL_HASH_VERSION, IS_EXACT_DUPLICATE_DISTANCE,  MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE, TRANSITIVE_FILE_RELATION_TYPES } from "../client/js/duplicates.js";
import { HASH_ALGORITHMS } from "../perf-binding/perf-img.js";
import { exactDuplicateHash } from "../server/duplicates.js";
import { dball, dballselect, dbBeginTransaction, dbEndTransaction, dbrun, dbtuples, dbvariablelist } from "./db-util.js";
import { Job } from "./job-manager.js";
import { Files } from "./taggables.js";

/** @import {Databases} from "./db-util.js" */
/** @import {DBFile} from "./taggables.js" */
/** @import {TransitiveFileRelationType, NontransitiveFileRelationType} from "../client/js/duplicates.js" */

/**
 * @param {Databases} dbs
 * @param {Map<string, DBFile[]>} existingPHashedFilesExactBitmapHashMap
 * @param {DBFile[]} existingPHashedFiles
 * @param {DBFile[]} filesToCompare
 */
async function compareFiles(dbs, existingPHashedFilesExactBitmapHashMap, existingPHashedFiles, filesToCompare) {
    dbs = await dbBeginTransaction(dbs);

    /** @type {PreInsertFileComparison[]} */
    const fileComparisonsToAdd = [];

    const filesToCompareMap = new Map(filesToCompare.map(file => [
        file.File_ID, Files.getLocation(dbs, file)
    ]));

    const {hashMap} = await dbs.perfImg.performAndGetHashes(HASH_ALGORITHMS.OCV_MARR_HILDRETH_HASH, filesToCompareMap);

    for (const fileToCompare of filesToCompare) {
        try {
            fileToCompare.Exact_Bitmap_Hash = await exactDuplicateHash(Files.getLocation(dbs, fileToCompare));
        // Empty catch, some files just cant be exact compared (videos, mainly)
        } catch (e){
            console.log(e);
        }
        fileToCompare.Perceptual_Hash = hashMap.get(fileToCompare.File_ID);
        fileToCompare.Perceptual_Hash_Version = CURRENT_PERCEPTUAL_HASH_VERSION;

        await dbrun(dbs, `
            UPDATE Files
               SET Perceptual_Hash_Version = ${CURRENT_PERCEPTUAL_HASH_VERSION},
                   Perceptual_Hash = ?,
                   Exact_Bitmap_Hash = ?
             WHERE File_ID = ?;`,
            [fileToCompare.Perceptual_Hash, fileToCompare.Exact_Bitmap_Hash, fileToCompare.File_ID]
        );
        
        if (fileToCompare.Exact_Bitmap_Hash !== null) {
            const exactBitmapHashArray = mapNullCoalesce(existingPHashedFilesExactBitmapHashMap, fileToCompare.Exact_Bitmap_Hash.toString("hex"), []);
            for (const exactBitmapFileMatch of exactBitmapHashArray) {
                fileComparisonsToAdd.push({
                    File_ID_1: fileToCompare.File_ID,
                    File_ID_2: exactBitmapFileMatch.File_ID,
                    Perceptual_Hash_Distance: IS_EXACT_DUPLICATE_DISTANCE
                });
            }
            
            exactBitmapHashArray.push(fileToCompare);
        }
    }

    const {comparisonsMade} = await dbs.perfImg.compareHashes(HASH_ALGORITHMS.OCV_MARR_HILDRETH_HASH, null, MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE);
    for (const hashComparison of comparisonsMade) {
        const file1 = existingPHashedFiles.find(file => file.File_ID === hashComparison.hash1FileID);
        const file2 = existingPHashedFiles.find(file => file.File_ID === hashComparison.hash2FileID);
        if (file1.Exact_Bitmap_Hash !== null && file2.Exact_Bitmap_Hash !== null && file1.Exact_Bitmap_Hash.toString("hex") === file2.Exact_Bitmap_Hash.toString("hex")) {
            continue;
        }

        fileComparisonsToAdd.push(({
            File_ID_1: file1.File_ID,
            File_ID_2: file2.File_ID,
            Perceptual_Hash_Distance: hashComparison.distance
        }));
    }
    
    await FileComparisons.insertMany(dbs, fileComparisonsToAdd);

    await dbEndTransaction(dbs);
}

/**
 * @typedef {Object} PreInsertFileComparison
 * @property {number} File_ID_1
 * @property {number} File_ID_2
 * @property {number} Perceptual_Hash_Distance
 **/

/**
 * @typedef {Object} DBFileComparison
 * @property {number} File_Comparisons_Made_ID
 * @property {Buffer} File_Comparisons_Made_PK_Hash
 * @property {number} Comparison_Is_Checked
 * @property {number} File_ID_1
 * @property {number} File_ID_2
 * @property {number} Perceptual_Hash_Distance
 */

/**
 * @param {PreInsertFileComparison} preInsertFileComparison 
 */
function fileComparisonPKHash(preInsertFileComparison) {
    return `${preInsertFileComparison.File_ID_1}\x01${preInsertFileComparison.File_ID_2}`;
}

/**
 * @param {PreInsertFileComparison} preInsertFileComparison 
 */
function preparePreInsertFileComparison(preInsertFileComparison) {
    let {File_ID_1, File_ID_2} = preInsertFileComparison;
    if (preInsertFileComparison.File_ID_1 > preInsertFileComparison.File_ID_2) {
        File_ID_1 = preInsertFileComparison.File_ID_2;
        File_ID_2 = preInsertFileComparison.File_ID_1;
    }

    return {
        ...preInsertFileComparison,
        File_ID_1,
        File_ID_2,
        File_Comparisons_Made_PK_Hash: fileComparisonPKHash(preInsertFileComparison)
    };
}

const COMPARE_FILES_CHUNK_SIZE = 25;
export class FileComparisons {

    /**
     * @param {Databases} dbs
     * @param {number[]} fileIDs
     */
    static compareFilesForDuplicatesJob(dbs, fileIDs) {
        return new Job({
            durationBetweenTasks: 250,
            jobName: "Comparing files for duplicates"
        }, async function*() {
            // Get all already hashed files
            const existingPHashedFiles = await Files.selectAllWithPerceptualHashVersion(dbs, CURRENT_PERCEPTUAL_HASH_VERSION);
            // Assign the hashes to perfimg
            await dbs.perfImg.assignHashes(HASH_ALGORITHMS.OCV_MARR_HILDRETH_HASH, new Map(existingPHashedFiles.map(file => [
                file.File_ID,
                file.Perceptual_Hash
            ])));
            const existingPHashedFileIDs = new Set(existingPHashedFiles.map(file => file.File_ID));
            // Set the hashes as already compared in perfimg
            await dbs.perfImg.setComparedFiles(HASH_ALGORITHMS.OCV_MARR_HILDRETH_HASH, [...existingPHashedFileIDs]);
            /** @type {Map<string, DBFile[]>} */
            const existingPHashedFilesExactBitmapHashMap = new Map();
            for (const file of existingPHashedFiles) {
                if (file.Exact_Bitmap_Hash === null) {
                    continue;
                }

                const exactBitmapHashArray = mapNullCoalesce(existingPHashedFilesExactBitmapHashMap, file.Exact_Bitmap_Hash.toString("hex"), []);
                exactBitmapHashArray.push(file);
            }

            let entriesHandled = 0;
            const files = (await Files.selectManyByIDs(dbs, fileIDs)).filter(file => !existingPHashedFileIDs.has(file.File_ID));
            yield {remainingSubtasks: files.length};

            /** @type {DBFile[]} */
            let fileComparisonChunk = [];

            for (const file of files) {
                ++entriesHandled;

                if (existingPHashedFileIDs.has(file.File_ID)) {
                    continue;
                }
                existingPHashedFiles.push(file);
                existingPHashedFileIDs.add(file.File_ID);

                fileComparisonChunk.push(file);

                if (fileComparisonChunk.length >= COMPARE_FILES_CHUNK_SIZE) {
                    yield {upcomingSubtasks: entriesHandled, upcomingTaskName: `Comparing ${fileComparisonChunk.length} additional files`, resetCachesAfter: ["files"]};
                    entriesHandled = 0;
                    await compareFiles(dbs, existingPHashedFilesExactBitmapHashMap, existingPHashedFiles, fileComparisonChunk);
                    fileComparisonChunk = [];
                }
            }

            
            if (entriesHandled > 0) {
                yield {upcomingSubtasks: entriesHandled, upcomingTaskName: `Comparing ${fileComparisonChunk.length} additional files`, resetCachesAfter: ["files"]};
                entriesHandled = 0;
                
                if (fileComparisonChunk.length > 0) {
                    await compareFiles(dbs, existingPHashedFilesExactBitmapHashMap, existingPHashedFiles, fileComparisonChunk);
                    fileComparisonChunk = [];
                }
            }
        });
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} fileIDs
     * @param {number} maxPerceptualHashDistance
     */
    static async selectManyByFileIDs(dbs, fileIDs, maxPerceptualHashDistance) {
        if (fileIDs.length === 0) {
            return [];
        }

        /** @type {DBFileComparison[]} */
        const fileComparisons = await dballselect(dbs, `
            SELECT 
                FCR.*,
                CASE WHEN (
                    NOT EXISTS (
                        SELECT COUNT(1)
                        FROM Transitive_File_Relation_Groups_Files TFRGF
                        JOIN Transitive_File_Relation_Groups TFRG ON TFRGF.Transitive_File_Relation_Groups_ID = TFRG.Transitive_File_Relation_Groups_ID
                        WHERE TFRGF.File_ID IN (FCR.File_ID_1, FCR.File_ID_2) AND TFRG.File_Relation_Type = ?
                        GROUP BY TFRGF.Transitive_File_Relation_Groups_ID
                        HAVING COUNT(1) = 2
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM Nontransitive_File_Relations NFR
                        WHERE NFR.File_ID_1 = FCR.File_ID_1 AND NFR.File_ID_2 = FCR.File_ID_2
                    )
                ) THEN 0 ELSE 1 END AS Comparison_Is_Checked
            FROM File_Comparisons_Made FCR
            WHERE FCR.Perceptual_Hash_Distance < ?
            AND (FCR.File_ID_1 IN ${dbvariablelist(fileIDs.length)}
             AND FCR.File_ID_2 IN ${dbvariablelist(fileIDs.length)}
            );
        `, [TRANSITIVE_FILE_RELATION_TYPES.DUPLICATES, maxPerceptualHashDistance, ...fileIDs, ...fileIDs]);

        return fileComparisons;
    }

    /**
     * 
     * @param {Databases} dbs 
     * @param {PreInsertFileComparison[]} fileComparisons 
     */
    static async insertMany(dbs, fileComparisons) {
        if (fileComparisons.length === 0) {
            return;
        }

        const preparedFileComparisons = fileComparisons.map(preparePreInsertFileComparison);

        const fileComparisonsMadeInsertionParams = [];
        for (const fileComparison of preparedFileComparisons) {
            fileComparisonsMadeInsertionParams.push(fileComparison.File_Comparisons_Made_PK_Hash);
            fileComparisonsMadeInsertionParams.push(fileComparison.File_ID_1);
            fileComparisonsMadeInsertionParams.push(fileComparison.File_ID_2);
            fileComparisonsMadeInsertionParams.push(fileComparison.Perceptual_Hash_Distance);
        }

        await dbrun(dbs, `
            INSERT INTO
            File_Comparisons_Made(
                File_Comparisons_Made_PK_Hash,
                File_ID_1,
                File_ID_2,
                Perceptual_Hash_Distance
            ) VALUES ${dbtuples(fileComparisons.length, 4)}
        `, fileComparisonsMadeInsertionParams)
    }
}

/**
 * @typedef {Object} PreInsertBetterDuplicateFileRelation
 * @property {number} Better_File_ID
 * @property {number} Worse_File_ID
 * 
 * @typedef {PreInsertBetterDuplicateFileRelation & { Better_Duplicate_File_RelationsPK_Hash: string }} PreparedPreInsertBetterDuplicateFileRelation
 * @typedef {PreparedPreInsertBetterDuplicateFileRelation & { Better_Duplicate_File_RelationsID: number }} DBBetterDuplicateFileRelation
 **/

/**
 * @param {PreInsertBetterDuplicateFileRelation} preInsertBetterDuplicateFileRelation 
 */
function betterDuplicateFileRelationPKHash(preInsertBetterDuplicateFileRelation) {
    return `${preInsertBetterDuplicateFileRelation.Better_File_ID}\x01${preInsertBetterDuplicateFileRelation.Worse_File_ID}`;
}

/**
 * @param {PreInsertBetterDuplicateFileRelation} preInsertBetterDuplicateFileRelation 
 */
function preparePreInsertBetterDuplicateFileRelation(preInsertBetterDuplicateFileRelation) {
    return {
        ...preInsertBetterDuplicateFileRelation,
        Better_Duplicate_File_RelationsPK_Hash: betterDuplicateFileRelationPKHash(preInsertBetterDuplicateFileRelation)
    };
}

export class BetterDuplicateFileRelations {
    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertBetterDuplicateFileRelation[]} betterDuplicateFileRelations
     */
    static async selectMany(dbs, betterDuplicateFileRelations) {
        if (betterDuplicateFileRelations.length === 0) {
            return [];
        }

        /** @type {DBBetterDuplicateFileRelation[]} */
        const dbBetterDuplicateFileRelations = await dballselect(dbs,
            `SELECT * FROM Better_Duplicate_File_Relations WHERE Better_Duplicate_File_Relations_PK_Hash IN ${dbvariablelist(betterDuplicateFileRelations.length)};`,
            betterDuplicateFileRelations.map(betterDuplicateFileRelation => betterDuplicateFileRelation.Better_Duplicate_File_RelationsPK_Hash)
        );
        return dbBetterDuplicateFileRelations;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertBetterDuplicateFileRelation[]} betterDuplicateFileRelations 
     */
    static async insertMany(dbs, betterDuplicateFileRelations) {
        if (betterDuplicateFileRelations.length === 0) {
            return [];
        }

        const betterDuplicateFileRelationsInsertionParams = [];
        for (const betterDuplicateFileRelation of betterDuplicateFileRelations) {
            betterDuplicateFileRelationsInsertionParams.push(betterDuplicateFileRelation.Better_Duplicate_File_RelationsPK_Hash);
            betterDuplicateFileRelationsInsertionParams.push(betterDuplicateFileRelation.Better_File_ID);
            betterDuplicateFileRelationsInsertionParams.push(betterDuplicateFileRelation.Worse_File_ID);
        }
        
        /** @type {DBBetterDuplicateFileRelation[]} */
        const betterDuplicateFileRelationsInserted = await dball(dbs, `
            INSERT INTO
            Better_Duplicate_File_Relations(
                Better_Duplicate_File_Relations_PK_Hash,
                Better_File_ID,
                Worse_File_ID
            ) VALUES ${dbtuples(betterDuplicateFileRelations.length, 3)} RETURNING *;
        `, betterDuplicateFileRelationsInsertionParams);

        return betterDuplicateFileRelationsInserted;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertBetterDuplicateFileRelation[]} betterDuplicateFileRelations 
     */
    static async uniqueInsertMany(dbs, betterDuplicateFileRelations) {
        if (betterDuplicateFileRelations.length === 0) {
            return [];
        }

        let preparedBetterDuplicateFileRelations = betterDuplicateFileRelations.map(preparePreInsertBetterDuplicateFileRelation);
        
        // dedupe
        preparedBetterDuplicateFileRelations = [...(new Map(preparedBetterDuplicateFileRelations.map(betterDuplicateFileRelation => [betterDuplicateFileRelation.Better_Duplicate_File_RelationsPK_Hash, betterDuplicateFileRelation]))).values()];

        const dbBetterDuplicateFileRelations = await BetterDuplicateFileRelations.selectMany(dbs, preparedBetterDuplicateFileRelations);
        const dbBetterDuplicateFileRelationsExisting = new Set(dbBetterDuplicateFileRelations.map(betterDuplicateFileRelation => betterDuplicateFileRelation.Better_Duplicate_File_RelationsPK_Hash));
        const betterDuplicateFileRelationsToInsert = preparedBetterDuplicateFileRelations.filter(betterDuplicateFileRelation => !dbBetterDuplicateFileRelationsExisting.has(betterDuplicateFileRelation.Better_Duplicate_File_RelationsPK_Hash));
        const insertedBetterDuplicateFileRelations = await BetterDuplicateFileRelations.insertMany(dbs, betterDuplicateFileRelationsToInsert);

        return dbBetterDuplicateFileRelations.concat(insertedBetterDuplicateFileRelations);
    }
}

/**
 * @typedef {Object} DBTransitiveFileRelation
 * @property {number} Transitive_File_Relation_Groups_ID
 * @property {number} File_ID
 */

/**
 * @typedef {Object} DBTransitiveFileRelationGroup
 * @property {number} Transitive_File_Relation_Groups_ID
 * @property {TransitiveFileRelationType} File_Relation_Type 
 */

/**
 * @typedef {Object} PreInsertTransitiveFileRelation
 * @property {number} File_ID_1
 * @property {number} File_ID_2
 * @property {TransitiveFileRelationType} File_Relation_Type
 **/


/**
 * @param {Databases} dbs
 * @param {DBTransitiveFileRelationGroup[]} transitiveFileRelationGroups
 */
async function mapTransitiveFileRelationGroups(dbs, transitiveFileRelationGroups) {
    /** @type {Map<number, number[]>} */
    const transitiveFileRelationGroupToFileIDsMap = new Map(transitiveFileRelationGroups.map(transitiveFileRelationGroup => [transitiveFileRelationGroup.Transitive_File_Relation_Groups_ID, []]));
    
    const transitiveFileRelations = await TransitiveFileRelations.selectManyFileRelationsByGroupIDs(dbs, transitiveFileRelationGroups.map(group => group.Transitive_File_Relation_Groups_ID));
    for (const transitiveFileRelation of transitiveFileRelations) {
        transitiveFileRelationGroupToFileIDsMap.get(transitiveFileRelation.Transitive_File_Relation_Groups_ID).push(transitiveFileRelation.File_ID);
    }

    return transitiveFileRelationGroups.map(group => ({
        ...group,
        File_IDs: transitiveFileRelationGroupToFileIDsMap.get(group.Transitive_File_Relation_Groups_ID)
    }));
}

export class TransitiveFileRelations {
    /**
     * @param {Databases} dbs 
     * @param {number[]} groupIDs 
     */
    static async selectManyFileRelationsByGroupIDs(dbs, groupIDs) {
        /** @type {DBTransitiveFileRelation[]} */
        const dbTransitiveFileRelations = await dballselect(dbs, `
            SELECT *
            FROM Transitive_File_Relation_Groups_Files
            WHERE Transitive_File_Relation_Groups_ID IN ${dbvariablelist(groupIDs.length)}  
        `, groupIDs
        );

        return dbTransitiveFileRelations;
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} fileIDs
     * @param {number} fileRelationType
     */
    static async selectManyGroupsByFileIDsWithRelationType(dbs, fileIDs, fileRelationType) {
        if (fileIDs.length === 0) {
            return [];
        }

        /** @type {DBTransitiveFileRelationGroup[]} */
        const dbTransitiveFileRelationGroups = await dballselect(dbs, `
            SELECT *
            FROM Transitive_File_Relation_Groups TFRG
            WHERE File_Relation_Type = ?
            AND EXISTS (
                SELECT 1
                FROM Transitive_File_Relation_Groups_Files TFRGF
                WHERE TFRGF.Transitive_File_Relation_Groups_ID = TFRG.Transitive_File_Relation_Groups_ID
                  AND File_ID IN ${dbvariablelist(fileIDs.length)}
            );
        `, [fileRelationType, ...fileIDs]
        );
        return await mapTransitiveFileRelationGroups(dbs, dbTransitiveFileRelationGroups);
    }

    /**
     * @param {Databases} dbs 
     * @param {TransitiveFileRelationType[]} fileRelationTypes
     */
    static async insertManyGroups(dbs, fileRelationTypes) {
        if (fileRelationTypes.length === 0) {
            return [];
        }

        const transitiveFileRelationsInsertionParams = [];
        for (const fileRelationType of fileRelationTypes) {
            transitiveFileRelationsInsertionParams.push(fileRelationType);
        }
        
        /** @type {DBTransitiveFileRelationGroup[]} */
        const dbTransitiveFileRelationGroups = await dball(dbs, `
            INSERT INTO
            Transitive_File_Relation_Groups(
                File_Relation_Type
            ) VALUES ${dbtuples(fileRelationTypes.length, 1)} RETURNING *;
        `, transitiveFileRelationsInsertionParams);

        return dbTransitiveFileRelationGroups;
    }

    /**
     * 
     * @param {Databases} dbs 
     * @param {DBTransitiveFileRelation[]} dbTransitiveFileRelations 
     */
    static async insertManyGroupFiles(dbs, dbTransitiveFileRelations ) {
        if (dbTransitiveFileRelations.length === 0) {
            return;
        }

        const transitiveFileRelationGroupsFilesInsertionParams = [];
        for (const transitiveFileRelation of dbTransitiveFileRelations) {
            transitiveFileRelationGroupsFilesInsertionParams.push(transitiveFileRelation.Transitive_File_Relation_Groups_ID);
            transitiveFileRelationGroupsFilesInsertionParams.push(transitiveFileRelation.File_ID);
        }
        
        await dbrun(dbs, `
            INSERT INTO
            Transitive_File_Relation_Groups_Files(
                Transitive_File_Relation_Groups_ID,
                File_ID
            ) VALUES ${dbtuples(dbTransitiveFileRelations.length, 2)};
        `, transitiveFileRelationGroupsFilesInsertionParams);
    }

    /**
     * 
     * @param {Databases} dbs 
     * @param {TransitiveFileRelationType} fileRelationType 
     * @param {Omit<PreInsertTransitiveFileRelation, "File_Relation_Type">[]} transitiveFileRelations 
     */
    static async #uniqueInsertManyByFileRelationType(dbs, fileRelationType, transitiveFileRelations) {
        const fileIDs = [...new Set(transitiveFileRelations.flatMap(fileRelation => [fileRelation.File_ID_1, fileRelation.File_ID_2]))];
        const transitiveFileRelationGroups = await TransitiveFileRelations.selectManyGroupsByFileIDsWithRelationType(dbs, fileIDs, fileRelationType);
        const beforeGroupIDToFileIDs = new Map(transitiveFileRelationGroups.map(group => [group.Transitive_File_Relation_Groups_ID, new Set(group.File_IDs)]));

        const afterGroups = new TransitiveRelationGroups(new Map(transitiveFileRelationGroups.map(group => [group.Transitive_File_Relation_Groups_ID, new Set(group.File_IDs)])));
        for (const fileRelation of transitiveFileRelations) {
            afterGroups.addRelation(fileRelation.File_ID_1, fileRelation.File_ID_2);
        }

        dbs = await dbBeginTransaction(dbs);
        const newGroupsNeeded = [...afterGroups.groupIDs()].filter(groupID => !beforeGroupIDToFileIDs.has(groupID));
        const newGroups = await TransitiveFileRelations.insertManyGroups(dbs, newGroupsNeeded.map(_ => fileRelationType));
        const fakeIDToNewGroupsMap = new Map(newGroups.map((group, i) => [newGroupsNeeded[i], group]));

        const deleteGroupsNeeded = [...beforeGroupIDToFileIDs.keys()].filter(groupID => !afterGroups.has(groupID));
        await TransitiveFileRelations.deleteManyGroupsByID(dbs, deleteGroupsNeeded);

        /** @type {DBTransitiveFileRelation[]} */
        const dbTransitiveFileRelations = [];
        for (let [groupID, afterFileIDs] of afterGroups) {
            if (!beforeGroupIDToFileIDs.has(groupID)) {
                groupID = fakeIDToNewGroupsMap.get(groupID).Transitive_File_Relation_Groups_ID;
            }
            const beforeFileIDs = beforeGroupIDToFileIDs.get(groupID) ?? new Set();
            for (const afterFileID of afterFileIDs) {
                if (!beforeFileIDs.has(afterFileID)) {
                    dbTransitiveFileRelations.push({
                        Transitive_File_Relation_Groups_ID: groupID,
                        File_ID: afterFileID
                    });
                }
            }
        }

        await TransitiveFileRelations.insertManyGroupFiles(dbs, dbTransitiveFileRelations);

        await dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertTransitiveFileRelation[]} transitiveFileRelations 
     */
    static async uniqueInsertMany(dbs, transitiveFileRelations) {
        if (transitiveFileRelations.length === 0) {
            return [];
        }

        /** @type {Map<TransitiveFileRelationType, PreInsertTransitiveFileRelation[]>} */
        const fileRelationTypeToTransitiveFileRelationMap = new Map();
        for (const fileRelation of transitiveFileRelations) {
            mapNullCoalesce(fileRelationTypeToTransitiveFileRelationMap, fileRelation.File_Relation_Type, []).push(fileRelation);
        }

        for (const [fileRelationType, transitiveFileRelations] of fileRelationTypeToTransitiveFileRelationMap) {
            await TransitiveFileRelations.#uniqueInsertManyByFileRelationType(dbs, fileRelationType, transitiveFileRelations);
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} groupIDs 
     */
    static async deleteManyGroupsByID(dbs, groupIDs) {
        if (groupIDs.length === 0) {
            return;
        }

        dbs = await dbBeginTransaction(dbs);
        await dbrun(dbs, `
            DELETE FROM Transitive_File_Relation_Groups_Files WHERE Transitive_File_Relation_Groups_ID IN ${dbvariablelist(groupIDs.length)};
        `, groupIDs);
        
        await dbrun(dbs, `
            DELETE FROM Transitive_File_Relation_Groups WHERE Transitive_File_Relation_Groups_ID IN ${dbvariablelist(groupIDs.length)};
        `, groupIDs);

        dbs = await dbEndTransaction(dbs);
    }
}

/**
 * @typedef {Object} PreInsertNontransitiveFileRelation
 * @property {number} File_ID_1
 * @property {number} File_ID_2
 * @property {NontransitiveFileRelationType} File_Relation_Type
 * 
 * @typedef {PreInsertNontransitiveFileRelation & { Nontransitive_File_Relations_PK_Hash: string }} PreparedPreInsertNontransitiveFileRelation
 * @typedef {PreparedPreInsertNontransitiveFileRelation & { Nontransitive_File_Relations_ID: number}} DBNontransitiveFileRelation
 **/

/**
 * @param {PreInsertNontransitiveFileRelation} nontransitiveFileRelation 
 */
function nontransitiveFileRelationPKHash(nontransitiveFileRelation) {
    return `${nontransitiveFileRelation.File_ID_1}\x01${nontransitiveFileRelation.File_ID_2}\x01${nontransitiveFileRelation.File_Relation_Type}`;
}

/**
 * @param {PreInsertNontransitiveFileRelation} nontransitiveFileRelation 
 */
function preparePreInsertNontransitiveFileRelation(nontransitiveFileRelation) {
    let {File_ID_1, File_ID_2} = nontransitiveFileRelation;
    if (nontransitiveFileRelation.File_ID_1 > nontransitiveFileRelation.File_ID_2) {
        File_ID_1 = nontransitiveFileRelation.File_ID_2;
        File_ID_2 = nontransitiveFileRelation.File_ID_1;
    }

    return {
        ...nontransitiveFileRelation,
        File_ID_1,
        File_ID_2,
        Nontransitive_File_Relations_PK_Hash: nontransitiveFileRelationPKHash(nontransitiveFileRelation)
    };
}

export class NontransitiveFileRelations {
    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertNontransitiveFileRelation[]} nontransitiveFileRelations
     */
    static async selectMany(dbs, nontransitiveFileRelations) {
        if (nontransitiveFileRelations.length === 0) {
            return [];
        }

        /** @type {DBNontransitiveFileRelation[]} */
        const dbNontransitiveFileRelations = await dballselect(dbs,
            `SELECT * FROM Nontransitive_File_Relations WHERE Nontransitive_File_Relations_PK_Hash IN ${dbvariablelist(nontransitiveFileRelations.length)};`,
            nontransitiveFileRelations.map(nontransitiveFileRelation => nontransitiveFileRelation.Nontransitive_File_Relations_PK_Hash)
        );
        return dbNontransitiveFileRelations;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertNontransitiveFileRelation[]} nontransitiveFileRelations 
     */
    static async insertMany(dbs, nontransitiveFileRelations) {
        if (nontransitiveFileRelations.length === 0) {
            return [];
        }

        const nontransitiveFileRelationsInsertionParams = [];
        for (const betterDuplicateFileRelation of nontransitiveFileRelations) {
            nontransitiveFileRelationsInsertionParams.push(betterDuplicateFileRelation.Nontransitive_File_Relations_PK_Hash);
            nontransitiveFileRelationsInsertionParams.push(betterDuplicateFileRelation.File_ID_1);
            nontransitiveFileRelationsInsertionParams.push(betterDuplicateFileRelation.File_ID_2);
            nontransitiveFileRelationsInsertionParams.push(betterDuplicateFileRelation.File_Relation_Type);
        }
        
        /** @type {DBNontransitiveFileRelation[]} */
        const dbNontransitiveFileRelations = await dball(dbs, `
            INSERT INTO
            Nontransitive_File_Relations(
                Nontransitive_File_Relations_PK_Hash,
                File_ID_1,
                File_ID_2,
                File_Relation_Type
            ) VALUES ${dbtuples(nontransitiveFileRelations.length, 4)} RETURNING *;
        `, nontransitiveFileRelationsInsertionParams);

        return dbNontransitiveFileRelations;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertNontransitiveFileRelation[]} nontransitiveFileRelations 
     */
    static async uniqueInsertMany(dbs, nontransitiveFileRelations) {
        if (nontransitiveFileRelations.length === 0) {
            return [];
        }

        let preparedNontransitiveFileRelations = nontransitiveFileRelations.map(preparePreInsertNontransitiveFileRelation);
        
        // dedupe
        preparedNontransitiveFileRelations = [...(new Map(preparedNontransitiveFileRelations.map(nontransitiveFileRelation => [nontransitiveFileRelation.Nontransitive_File_Relations_PK_Hash, nontransitiveFileRelation]))).values()];

        const dbNontransitiveFileRelations = await NontransitiveFileRelations.selectMany(dbs, preparedNontransitiveFileRelations);
        const dbNontransitiveFileRelationsExisting = new Set(dbNontransitiveFileRelations.map(dbNontransitiveFileRelation => dbNontransitiveFileRelation.Nontransitive_File_Relations_PK_Hash));
        const nontransitiveFileRelationsToInsert = preparedNontransitiveFileRelations.filter(nontransitiveFileRelation => !dbNontransitiveFileRelationsExisting.has(nontransitiveFileRelation.Nontransitive_File_Relations_PK_Hash));
        const insertedNontransitiveFileRelations = await NontransitiveFileRelations.insertMany(dbs, nontransitiveFileRelationsToInsert);

        return dbNontransitiveFileRelations.concat(insertedNontransitiveFileRelations);
    }
}