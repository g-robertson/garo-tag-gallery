import { FILE_HASH_TAG_TYPE } from "../client/js/tags.js";
import {dball, dbrun, dbtuples} from "./db-util.js";
import {upsertTags} from "./tags.js";

/** @import {Databases} from "./db-util.js" */
/** @import {DBFileExtension} from "./tags.js" */

/**
 * @typedef {Object} DBTaggable
 * @property {bigint} Taggable_ID
 * @property {string} Taggable_Name
 * @property {number} Taggable_Last_Viewed_Date
 * @property {number} Taggable_Last_Modified_Date
 * @property {number} Taggable_Created_Date
 * @property {number} Taggable_Deleted_Date
 */

/**
 * @typedef {{
 * File_Name: string
 * File_Hash: Buffer
 * Taggable_Name: string
 * sourceLocation: string
 * } & DBFileExtension} PreInsertFile
 */

/**
 * @typedef {Object} DBFile
 * @property {number} File_ID
 * @property {bigint} Taggable_ID
 * @property {string} File_Name
 * @property {Buffer} File_Hash
 * @property {number} Has_File_Hash_Tag_ID
 * @property {number} File_Extension_ID
 */

/** @typedef {DBFile & DBFileExtension & DBTaggable} DBJoinedFile */

/**
 * @param {Databases} dbs 
 * @param {string[]} taggableNames 
 */
async function insertTaggables(dbs, taggableNames) {
    if (taggableNames.length === 0) {
        return [];
    }

    /** @type {DBTaggable[]} */
    const dbTaggables = await dball(dbs, `
        INSERT INTO Taggables(
            Taggable_Name
        ) VALUES ${dbtuples(taggableNames.length, 1)} RETURNING *;
        `, taggableNames
    );
    return dbTaggables.map(dbTaggable => ({
        ...dbTaggable,
        Taggable_ID: BigInt(dbTaggable.Taggable_ID)
    }));
}

/**
 * @param {Databases} dbs 
 * @param {Map<bigint, number>} taggablesTimes
 */
export async function updateTaggablesCreatedDate(dbs, taggablesTimes) {
    for (const [taggableId, createdTime] of taggablesTimes.entries()) {
        await dbrun(dbs, "UPDATE Taggables SET Taggable_Created_Date = ? WHERE Taggable_ID = ?;", [createdTime, Number(taggableId)]);
    }
}

/**
 * @param {Databases} dbs 
 * @param {Map<bigint, number>} taggablesTimes
 */
export async function updateTaggablesLastModifiedDate(dbs, taggablesTimes) {
    for (const [taggableId, modifiedTime] of taggablesTimes.entries()) {
        await dbrun(dbs, "UPDATE Taggables SET Taggable_Last_Modified_Date = ? WHERE Taggable_ID = ?;", [modifiedTime, Number(taggableId)]);
    }
}

/**
 * @param {Databases} dbs 
 * @param {Map<bigint, number>} taggablesTimes
 */
export async function updateTaggablesLastViewedDate(dbs, taggablesTimes) {
    for (const [taggableId, lastViewedTime] of taggablesTimes.entries()) {
        await dbrun(dbs, "UPDATE Taggables SET Taggable_Last_Viewed_Date = ? WHERE Taggable_ID = ?;", [lastViewedTime, Number(taggableId)]);
    }
}

/**
 * @param {Databases} dbs 
 * @param {Map<bigint, number>} taggablesTimes
 */
export async function updateTaggablesDeletedDate(dbs, taggablesTimes) {
    for (const [taggableId, deletedTime] of taggablesTimes.entries()) {
        await dbrun(dbs, "UPDATE Taggables SET Taggable_Deleted_Date = ? WHERE Taggable_ID = ?;", [deletedTime, Number(taggableId)]);
    }
}

/**
 * @param {Databases} dbs
 * @param {PreInsertFile[]} files
 */
export async function insertFiles(dbs, files) {
    if (files.length === 0) {
        return {
            dbFiles: [],
            finalizeFileMove: () => {}
        };
    }

    const fileToSourceLocationMap = new Map(files.map(file => [file.File_Hash.toString(), file.sourceLocation]));

    const insertedTaggables = await insertTaggables(dbs, files.map(file => file.Taggable_Name));

    const hasFileHashTags = await upsertTags(dbs, files.map(file => ({
        Source_Name: "System generated",
        Display_Name: `system:has hash:${file.File_Hash.toString("hex")}`,
        Lookup_Name: `system:has hash:${file.File_Hash.toString("hex")}`,
        Tag_Type: FILE_HASH_TAG_TYPE,
        User_Editable: 0
    })));

    const hasFileHashTagMap = new Map(hasFileHashTags.map(hasFileHashTag => [hasFileHashTag.Lookup_Name.slice("system:has hash:".length), hasFileHashTag]));

    const fileInsertionParams = [];
    for (let i = 0; i < files.length; ++i) {
        fileInsertionParams.push(Number(insertedTaggables[i].Taggable_ID));
        fileInsertionParams.push(files[i].File_Name);
        fileInsertionParams.push(files[i].File_Hash);
        fileInsertionParams.push(Number(hasFileHashTagMap.get(files[i].File_Hash.toString("hex")).Tag_ID));
        fileInsertionParams.push(files[i].File_Extension_ID);
    }

    /** @type {DBFile[]} */
    const insertedDBFiles = await dball(dbs, `
        INSERT INTO Files(
            Taggable_ID,
            File_Name,
            File_Hash,
            Has_File_Hash_Tag_ID,
            File_Extension_ID
        ) VALUES ${dbtuples(files.length, 5)} RETURNING *;
        `, fileInsertionParams
    );
    
    return {
        dbFiles: insertedDBFiles.map((insertedDBFile, i) => ({
            ...insertedDBFile,
            ...files[i],
            ...insertedTaggables[i],
            Has_File_Hash_Tag_ID: BigInt(insertedDBFile.Has_File_Hash_Tag_ID)
        })),
        finalizeFileMove: () => {
            for (const insertedDBFile of insertedDBFiles) {
                dbs.fileStorage.move(fileToSourceLocationMap.get(insertedDBFile.File_Hash.toString()), insertedDBFile.File_Name, insertedDBFile.File_Hash)
            }
        }   
    };
}