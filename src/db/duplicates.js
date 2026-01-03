import { mapNullCoalesce } from "../client/js/client-util.js";
import { CURRENT_PERCEPTUAL_HASH_VERSION, IS_EXACT_DUPLICATE_DISTANCE, MAX_PERCEPTUAL_HASH_DISTANCE } from "../client/js/duplicates.js";
import { closeHash, closeHashDistances, exactDuplicateHash } from "../server/duplicates.js";
import { dballselect, dbBeginTransaction, dbEndTransaction, dbrun, dbtuples, dbvariablelist } from "./db-util.js";
import { Job } from "./job-manager.js";
import { Files } from "./taggables.js";

/** @import {Databases} from "./db-util.js" */
/** @import {DBFile} from "./taggables.js" */

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

    for (const fileToCompare of filesToCompare) {
        const fileName = Files.getLocation(dbs, fileToCompare);
        try {
            fileToCompare.Exact_Bitmap_Hash = await exactDuplicateHash(fileName);
        // Empty catch, some files just cant be exact compared (videos, mainly)
        } catch {}
        fileToCompare.Perceptual_Hash = await closeHash(fileName);
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

    const hashComparisons = await closeHashDistances(dbs, filesToCompare.map(file => file.Perceptual_Hash), MAX_PERCEPTUAL_HASH_DISTANCE);
    for (const hashComparison of hashComparisons) {
        const file1 = existingPHashedFiles[hashComparison.hash1Index];
        const file2 = existingPHashedFiles[hashComparison.hash2Index];
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
 * @property {number} File_ID_1
 * @property {number} File_ID_2
 * @property {number} Comparison_Is_Checked
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
    return {
        ...preInsertFileComparison,
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
            // Set them as already hashed within perf hash cmp
            await dbs.perfHashCmp.setAlreadyComparedHashes(existingPHashedFiles.map(file => file.Perceptual_Hash));
            const existingPHashedFileIDs = new Set(existingPHashedFiles.map(file => file.File_ID));
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

        const fileComparisons = await dballselect(dbs, `
            SELECT *
              FROM File_Comparisons_Made
             WHERE Perceptual_Hash_Distance < ?
               AND (File_ID_1 IN ${dbvariablelist(fileIDs.length)}
                 OR File_ID_2 IN ${dbvariablelist(fileIDs.length)}
               )
            ;
        `, [maxPerceptualHashDistance, ...fileIDs, ...fileIDs]);

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