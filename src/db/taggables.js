import sharp from "sharp";
import { IS_FILE_TAG, normalPreInsertLocalTag, SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../client/js/user.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";
import {asyncDataSlicer, dball, dballselect, dbrun, dbtuples, dbvariablelist} from "./db-util.js";
import { userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { LocalTags, UserFacingLocalTags } from "./tags.js";
import { extractFirstFrameWithFFMPEG, sha256 } from "../util.js";
import { readFile } from "fs/promises";
import { AppliedMetrics } from "./metrics.js";

/** @import {User} from "../client/js/user.js" */
/** @import {DBAppliedMetric} from "./metrics.js" */
/** @import {DBService} from "./services.js" */
/** @import {DBUser, PermissionInt} from "./user.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {DBFileExtension, DBJoinedURLAssociation, UserFacingLocalTag} from "./tags.js" */

/**
 * @typedef {Object} DBLocalTaggableService
 * @property {number} Local_Taggable_Service_ID
 * @property {bigint} In_Local_Taggable_Service_Tag_ID
 */

/**
 * @typedef {DBLocalTaggableService & DBService} DBJoinedLocalTaggableService
 */
/** @typedef {DBJoinedLocalTaggableService & {Permission_Extent: PermissionInt}} DBPermissionedLocalTaggableService */


/**
 * @param {DBJoinedLocalTaggableService} localTaggableService 
 */
function mapLocalTaggableService(localTaggableService) {
    if (localTaggableService === undefined) {
        return undefined;
    }

    return {
        ...localTaggableService,
        In_Local_Taggable_Service_Tag_ID: BigInt(localTaggableService.In_Local_Taggable_Service_Tag_ID)
    };
}

export class LocalTaggableServices {
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} inLocalTaggableServiceTagIDs 
     */
    static async selectManyByInLocalTaggableServiceTagIDs(dbs, inLocalTaggableServiceTagIDs) {
        /** @type {DBJoinedLocalTaggableService[]} */
        const localTaggableServices = await dballselect(dbs, `
            SELECT DISTINCT LTS.*, S.*
              FROM Local_Taggable_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID
              WHERE LTS.In_Local_Taggable_Service_Tag_ID IN ${dbvariablelist(inLocalTaggableServiceTagIDs.length)}
            `, inLocalTaggableServiceTagIDs.map(inLocalTaggableServiceTagID => Number(inLocalTaggableServiceTagID))
        );
        
        return localTaggableServices.map(mapLocalTaggableService);
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs
     */
    static async selectManyByTaggableIDs(dbs, taggableIDs) {
        // TODO: really need to implement a "read these specific tags from taggables", for both this and for getting applied metrics with a user, definitely more to come later too
        const {taggablePairings} = await dbs.perfTags.readTaggablesTags(taggableIDs, dbs.inTransaction);
        /** @type {Set<bigint>} */
        const allTagIDs = new Set();
        for (const tags of taggablePairings.values()) {
            for (const tag of tags) {
                allTagIDs.add(tag);
            }
        }

        return await LocalTaggableServices.selectManyByInLocalTaggableServiceTagIDs(dbs, [...allTagIDs]);
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableID 
     */
    static async selectByTaggableID(dbs, taggableID) {
        return (await LocalTaggableServices.selectManyByTaggableIDs(dbs, [taggableID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTaggableServiceIDs
     */
    static async selectManyByIDs(dbs, localTaggableServiceIDs) {
        /** @type {DBJoinedLocalTaggableService[]} */
        const localTaggableServices = await dballselect(dbs, `
            SELECT *
              FROM Local_Taggable_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID
              WHERE LTS.Local_Taggable_Service_ID IN ${dbvariablelist(localTaggableServiceIDs.length)};`, localTaggableServiceIDs
        );

        return localTaggableServices.map(mapLocalTaggableService);
    }

    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBJoinedLocalTaggableService[]} */
        const localTaggableServices = await dballselect(dbs, `
            SELECT *
              FROM Local_Taggable_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID;
        `);
        return localTaggableServices.map(mapLocalTaggableService);
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {PermissionInt} permissionBitsToCheck
     * @param {number[]} localTaggableServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionBitsToCheck, localTaggableServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionBitsToCheck, PERMISSIONS.LOCAL_TAG_SERVICES)) {
            return await LocalTaggableServices.selectManyByIDs(dbs, localTaggableServiceIDs);
        }

        /** @type {DBJoinedLocalTaggableService[]} */
        const localTaggableServices = await dballselect(dbs, `
            SELECT LTS.*, S.*
              FROM Local_Taggable_Services LTS
              JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
              JOIN Services S ON LTS.Service_ID = S.Service_ID
             WHERE SUP.User_ID = ?
               AND (SUP.Permission_Extent & ?) = ?
               AND LTS.Local_Taggable_Service_ID IN ${dbvariablelist(localTaggableServiceIDs.length)};
        `, [
            user.id(),
            permissionBitsToCheck,
            permissionBitsToCheck,
            ...localTaggableServiceIDs
        ]);

        return localTaggableServices.map(mapLocalTaggableService);
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {PermissionInt} permissionBitsToCheck 
     * @param {number} localTaggableServiceID
     */
    static async userSelectByID(dbs, user, permissionBitsToCheck, localTaggableServiceID) {
        return (await LocalTaggableServices.userSelectManyByIDs(dbs, user, permissionBitsToCheck, [localTaggableServiceID]))[0];
    }
    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {PermissionInt=} permissionBitsToCheck
     */
    static async userSelectAll(dbs, user, permissionBitsToCheck) {
        return await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
            LocalTaggableServices.selectAll,
            async () => {
                return (await dballselect(dbs, `
                    SELECT SUP.Permission_Extent, LTS.*, S.*
                      FROM Local_Taggable_Services LTS
                      JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
                      JOIN Services S ON LTS.Service_ID = S.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()})).map(mapLocalTaggableService);
            },
            "Local_Taggable_Service_ID",
            permissionBitsToCheck
        );
    }
}

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
 * @param {DBTaggable} dbTaggable 
 */
function mapDBTaggable(dbTaggable) {
    return {
        ...dbTaggable,
        Taggable_ID: BigInt(dbTaggable.Taggable_ID)
    };
}

export class Taggables {
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @returns {Promise<DBTaggable[]>}
     */
    static async selectManyByIDs(dbs, taggableIDs) {
        if (taggableIDs.length === 0) {
            return [];
        }
        if (taggableIDs.length > 10000) {
            const slices = await asyncDataSlicer(taggableIDs, 10000, (sliced) => Taggables.selectManyByIDs(dbs, sliced));
            return slices.flat();
        }

        /** @type {DBTaggable[]} */
        const dbTaggables = await dballselect(dbs, `SELECT * FROM Taggables WHERE Taggable_ID IN ${dbvariablelist(taggableIDs.length)};`, taggableIDs.map(taggableID => Number(taggableID)));
        return dbTaggables.map(mapDBTaggable);
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} taggableNames 
     */
    static async insertMany(dbs, taggableNames) {
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
        return dbTaggables.map(mapDBTaggable);
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, number>} taggablesTimes
     */
    static async updateManyCreatedDates(dbs, taggablesTimes) {
        for (const [taggableId, createdTime] of taggablesTimes.entries()) {
            await dbrun(dbs, "UPDATE Taggables SET Taggable_Created_Date = ? WHERE Taggable_ID = ?;", [createdTime, Number(taggableId)]);
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, number>} taggablesTimes
     */
    static async updateManyLastModifiedDates(dbs, taggablesTimes) {
        for (const [taggableId, modifiedTime] of taggablesTimes.entries()) {
            await dbrun(dbs, "UPDATE Taggables SET Taggable_Last_Modified_Date = ? WHERE Taggable_ID = ?;", [modifiedTime, Number(taggableId)]);
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, number>} taggablesTimes
     */
    static async updateManyLastViewedDates(dbs, taggablesTimes) {
        for (const [taggableId, lastViewedTime] of taggablesTimes.entries()) {
            await dbrun(dbs, "UPDATE Taggables SET Taggable_Last_Viewed_Date = ? WHERE Taggable_ID = ?;", [lastViewedTime, Number(taggableId)]);
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, number>} taggablesTimes
     */
    static async updateManyDeletedDates(dbs, taggablesTimes) {
        for (const [taggableId, deletedTime] of taggablesTimes.entries()) {
            await dbrun(dbs, "UPDATE Taggables SET Taggable_Deleted_Date = ? WHERE Taggable_ID = ?;", [deletedTime, Number(taggableId)]);
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {string} searchCriteria
     * @param {bigint[]} inLocalTaggableServiceTagIDs
     */
    static async search(dbs, searchCriteria, inLocalTaggableServiceTagIDs) {
        if (inLocalTaggableServiceTagIDs.length === 0) {
            return [];
        }

        let constructedSearch = PerfTags.searchUnion(
            inLocalTaggableServiceTagIDs.map(inLocalTaggableServiceTagID => PerfTags.searchTag(inLocalTaggableServiceTagID))
        );

        if (searchCriteria !== "") {
            constructedSearch = PerfTags.searchIntersect([searchCriteria, constructedSearch])
        }

        const {taggables} = await dbs.perfTags.search(constructedSearch, dbs.inTransaction);
        return await Taggables.selectManyByIDs(dbs, taggables);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {string} searchCriteria
     * @param {User} user
     */
    static async searchWithUser(dbs, searchCriteria, user) {
        const taggableServices = await LocalTaggableServices.userSelectAll(dbs, user, PERMISSION_BITS.READ);
        return await Taggables.search(dbs, searchCriteria, taggableServices.map(taggableService => taggableService.In_Local_Taggable_Service_Tag_ID));
    }
}

/**
 * @typedef {Object} DBUserFacingLocalFile
 * @property {number} Local_File_ID
 * @property {string} File_Hash
 * @property {string} File_Extension
 * @property {bigint} Taggable_ID
 * @property {string} Taggable_Name
 * @property {number} Taggable_Created_Date
 * @property {number} Taggable_Last_Modified_Date
 * @property {number} Taggable_Last_Viewed_Date
 * @property {number} Taggable_Deleted_Date
 * @property {UserFacingLocalTag[]} Tags
 * @property {DBAppliedMetric[]} Metrics
 */

/**
 * @param {Databases} dbs
 * @param {Omit<DBUserFacingLocalFile, "Tags">[]} dbUserFacingLocalFiles
 * @param {number} userID
 * @param {number[]} localTagServiceIDs
 * @param {number[]} localMetricServiceIDs
 */
async function mapDBUserFacingLocalFiles(dbs, dbUserFacingLocalFiles, userID, localTagServiceIDs, localMetricServiceIDs) {
    dbUserFacingLocalFiles = dbUserFacingLocalFiles.map(dbUserFacingLocalFile => ({
        ...dbUserFacingLocalFile,
        Taggable_ID: BigInt(dbUserFacingLocalFile.Taggable_ID)
    }));

    const taggableIDs = dbUserFacingLocalFiles.map(dbUserFacingLocalFile => dbUserFacingLocalFile.Taggable_ID);
    const taggablesTags = await UserFacingLocalTags.selectMappedByTaggableIDs(
        dbs,
        taggableIDs,
        [SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, ...localTagServiceIDs]
    );

    /** @type {Set<bigint>} */
    const allTagIDs = new Set();
    for (const tags of taggablesTags.values()) {
        for (const tag of tags) {
            allTagIDs.add(tag.Tag_ID);
        }
    }

    const appliedMetricTagIDs = await AppliedMetrics.selectManyByLocalAppliedMetricTagIDs(dbs, [...allTagIDs]);
    const appliedMetricMap = new Map(appliedMetricTagIDs.map(appliedMetric => [appliedMetric.Local_Applied_Metric_Tag_ID, appliedMetric]));

    return dbUserFacingLocalFiles.map(dbUserFacingLocalFile => ({
        ...dbUserFacingLocalFile,
        Tags: taggablesTags.get(dbUserFacingLocalFile.Taggable_ID).filter?.((tag => tag.Local_Tag_Service_ID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)) ?? [],
        Metrics: taggablesTags.get(dbUserFacingLocalFile.Taggable_ID).map?.(tag => appliedMetricMap.get(tag.Tag_ID)).filter?.(metric => metric !== undefined) ?? []
    }));
}

export class UserFacingLocalFiles {
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {Omit<DBUserFacingLocalFile, "Tags">[]} dbUserFacingLocalFiles
     * @param {number} userID
     * @param {number[]} localTagServiceIDs
     * @param {number[]} localMetricServiceIDs
     * @returns {Promise<DBUserFacingLocalFile[]>}
     */
    static async selectManyByTaggableIDs(dbs, taggableIDs, userID, localTagServiceIDs, localMetricServiceIDs) {
        if (taggableIDs.length === 0) {
            return [];
        }
        if (taggableIDs.length > 10000) {
            const slices = await asyncDataSlicer(taggableIDs, 10000, (sliced) => selectUserFacingTaggables(dbs, sliced, userID, localTagServiceIDs, localMetricServiceIDs));
            return slices.flat();
        }

        /** @type {Omit<DBUserFacingLocalFile, "Tags">[]} */
        const dbUserFacingLocalFiles = await dballselect(dbs, `
            SELECT LF.Local_File_ID,
                   LOWER(HEX(F.File_Hash)) AS File_Hash,
                   FE.File_Extension,
                   T.Taggable_ID,
                   T.Taggable_Name,
                   T.Taggable_Created_Date,
                   T.Taggable_Last_Modified_Date,
                   T.Taggable_Last_Viewed_Date,
                   T.Taggable_Deleted_Date
              FROM Taggables T
              JOIN Local_Files LF ON T.Taggable_ID = LF.Taggable_ID
              JOIN Files F ON LF.File_ID = F.File_ID
              JOIN File_Extensions FE ON F.File_Extension_ID = FE.File_Extension_ID 
                AND LF.Taggable_ID IN ${dbvariablelist(taggableIDs.length)};
        `, [...taggableIDs.map(taggableID => Number(taggableID))]
        );

        return await mapDBUserFacingLocalFiles(dbs, dbUserFacingLocalFiles, userID, localTagServiceIDs, localMetricServiceIDs);
    }
}



/**
 * @typedef {{
 *   File_Hash: Buffer
 *   sourceLocation: string
 * } & DBFileExtension} PreInsertFile
 */

/**
 * @typedef {Object} DBFile
 * @property {number} File_ID
 * @property {Buffer} File_Hash
 * @property {bigint} Has_File_Hash_Tag_ID
 * @property {number} File_Extension_ID
 */

/**
 * 
 * @param {DBFile} dbFile 
 * @param {PreInsertFile} file 
 */
function mapDBFile(dbFile, file) {
    return {
        ...dbFile,
        ...file,
        Has_File_Extension_Tag_ID: BigInt(file.Has_File_Extension_Tag_ID),
        Has_File_Hash_Tag_ID: BigInt(dbFile.Has_File_Hash_Tag_ID)
    };
}

export class Files {
    /**
     * @param {Databases} dbs 
     * @param {PreInsertFile[]} files
     */
    static async selectMany(dbs, files) {
        const filesMap = new Map(files.map(file => [file.File_Hash.toString("hex"), file]));

        /** @type {DBFile[]} */
        const dbFiles = await dballselect(dbs, `SELECT * FROM Files WHERE File_Hash IN ${dbvariablelist(files.length)}`, files.map(file => file.File_Hash));
        return dbFiles.map(dbFile => mapDBFile(dbFile, filesMap.get(dbFile.File_Hash.toString("hex"))));
    }
    
    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBFile[]} */
        const dbFiles = await dballselect(dbs, `
            SELECT *
              FROM Files F
              JOIN File_Extensions FE ON F.File_Extension_ID = FE.File_Extension_ID
        `);

        return dbFiles.map(dbFile => mapDBFile(dbFile, dbFile));
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertFile[]} files 
     */
    static async insertMany(dbs, files) {
        if (files.length === 0) {
            return {
                dbFiles: [],
                finalizeFileMove: async () => {}
            };
        }

        const fileToSourceLocationMap = new Map(files.map(file => [file.File_Hash.toString("hex"), file.sourceLocation]));

        const hasFileHashTags = await LocalTags.insertMany(dbs, files.map(file => normalPreInsertLocalTag(
            `system:has hash:${file.File_Hash.toString("hex")}`,
            "System generated"
        )));

        /** @type {{fileLocation: string, hash: Buffer}[]} */
        const thumbnailsGenerated = [];
        const prethumbnailHashes = [];
        sharp.cache({files: 0});
        const thumbnailPromises = [];
        for (let i = 0; i < files.length; ++i) {
            thumbnailPromises.push((async () => {
                const file = files[i];
                const SHARP_IMAGE_EXTENSIONS = [".jpg", ".png", ".webp", ".gif", ".avif", ".tiff"];

                const fileExtension = file.File_Extension;
                if (fileExtension === undefined) {
                    throw "File extension was undefined";
                }

                const sourceLocation = fileToSourceLocationMap.get(file.File_Hash.toString("hex"));
                /** @type {string} */
                let sharpSourceLocation;
                const sharpOutputLocation = `${sourceLocation}.thumb.jpg`
                if (SHARP_IMAGE_EXTENSIONS.indexOf(fileExtension.toLowerCase()) !== -1) {
                    sharpSourceLocation = sourceLocation;
                } else {
                    const success = await extractFirstFrameWithFFMPEG(sourceLocation, `${sourceLocation}.prethumb.jpg`);
                    if (success) {
                        prethumbnailHashes[i] = sha256(await readFile(`${sourceLocation}.prethumb.jpg`));

                        sharpSourceLocation = `${sourceLocation}.prethumb.jpg`;
                    }
                }

                if (sharpSourceLocation !== undefined) {
                    await sharp(sharpSourceLocation)
                    .resize(300, 200, {fit: "inside"})
                    .jpeg({force: true})
                    .toFile(sharpOutputLocation);
                    const fileContents = await readFile(sharpOutputLocation);

                    thumbnailsGenerated[i] = {
                        fileLocation: sharpOutputLocation,
                        hash: sha256(fileContents)
                    };
                }
            })());
        }

        await Promise.all(thumbnailPromises);

        const fileInsertionParams = [];
        for (let i = 0; i < files.length; ++i) {
            fileInsertionParams.push(files[i].File_Hash);
            fileInsertionParams.push(thumbnailsGenerated[i].hash);
            fileInsertionParams.push(prethumbnailHashes[i]);
            fileInsertionParams.push(Number(hasFileHashTags[i].Tag_ID));
            fileInsertionParams.push(files[i].File_Extension_ID);
        }

        /** @type {DBFile[]} */
        const insertedDBFiles = await dball(dbs, `
            INSERT INTO Files(
                File_Hash,
                Thumbnail_Hash,
                Prethumbnail_Hash,
                Has_File_Hash_Tag_ID,
                File_Extension_ID
            ) VALUES ${dbtuples(files.length, 5)} RETURNING *;
            `, fileInsertionParams
        );


        return {
            dbFiles: insertedDBFiles.map((dbFile, i) => mapDBFile(dbFile, files[i])),
            finalizeFileMove: async () => {
                for (let i = 0; i < insertedDBFiles.length; ++i) {
                    const insertedDBFile = insertedDBFiles[i];
                    const fileExtension = files[i].File_Extension;
                    if (fileExtension === undefined) {
                        throw "File extension was undefined";
                    }

                    const sourceLocation = fileToSourceLocationMap.get(insertedDBFile.File_Hash.toString("hex"));

                    await dbs.fileStorage.move(sourceLocation,
                        `${insertedDBFile.File_Hash.toString("hex")}${fileExtension}`,
                        insertedDBFile.File_Hash
                    );
                    if (thumbnailsGenerated[i] !== undefined) {
                        await dbs.fileStorage.move(`${thumbnailsGenerated[i].fileLocation}`,
                            `${insertedDBFile.File_Hash.toString("hex")}.thumb.jpg`,
                            insertedDBFile.File_Hash
                        );
                    }
                }
            }   
        };
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertFile[]} files 
     */
    static async upsertMany(dbs, files) {
        if (files.length === 0) {
            return {
                dbFiles: [],
                finalizeFileMove: () => {}
            };
        }

        // dedupe
        files = [...(new Map(files.map(file => [file.File_Hash.toString("hex"), file]))).values()];

        const dbFiles = await Files.selectMany(dbs, files);
        const dbFilesExisting = new Set(dbFiles.map(dbFile => dbFile.File_Hash.toString("hex")));
        const filesToInsert = files.filter(file => !dbFilesExisting.has(file.File_Hash.toString("hex")));
        const dbFilesInserted = await Files.insertMany(dbs, filesToInsert);
        return {
            dbFiles: dbFiles.concat(dbFilesInserted.dbFiles),
            finalizeFileMove: dbFilesInserted.finalizeFileMove
        };
    }

}

/**
 * @typedef {PreInsertFile & {Taggable_Name: string}} PreInsertLocalFile
 * @typedef {PreInsertLocalFile & DBFile} PreparedPreInsertLocalFile
 */

/**
 * @param {PreInsertLocalFile} preInsertLocalFile 
 * @param {DBFile} dbFile 
 */
function preparePreInsertLocalFile(preInsertLocalFile, dbFile) {
    return {
        ...preInsertLocalFile,
        ...dbFile
    };
}

/**
 * @typedef {Object} DBLocalFile
 * @property {number} Local_File_ID
 * @property {number} File_ID
 * @property {bigint} Taggable_ID
 */

/**
 * @param {DBLocalFile} dbLocalFile 
 * @param {PreparedPreInsertLocalFile} dbFile
 */
function mapDBLocalFile(dbLocalFile, dbFile) {
    return {
        ...dbLocalFile,
        ...dbFile,
        Taggable_ID: BigInt(dbLocalFile.Taggable_ID)
    };
}

export class LocalFiles {
    /**
     * @param {Databases} dbs
     * @param {PreparedPreInsertLocalFile[]} localFiles
     * @param {DBLocalTaggableService} dbLocalTaggableService
     */
    static async selectMany(dbs, localFiles, dbLocalTaggableService) {
        const {taggables} = await dbs.perfTags.search(PerfTags.searchIntersect([
            PerfTags.searchTag(dbLocalTaggableService.In_Local_Taggable_Service_Tag_ID),
            PerfTags.searchUnion(localFiles.map(dbFile => PerfTags.searchTag(dbFile.Has_File_Hash_Tag_ID)))
        ]), dbs.inTransaction);

        const dbFileMap = new Map(localFiles.map(dbFile => [dbFile.File_ID, dbFile]));

        /** @type {DBLocalFile[]} */
        const dbLocalFiles = await dballselect(dbs, `SELECT * FROM Local_Files Where Taggable_ID IN ${dbvariablelist(taggables.length)}`, taggables);

        return dbLocalFiles.map(dbLocalFile => mapDBLocalFile(dbLocalFile, dbFileMap.get(dbLocalFile.File_ID)));
    }

    /**
     * @param {Databases} dbs
     * @param {PreparedPreInsertLocalFile[]} localFiles
     * @param {DBLocalTaggableService} dbLocalTaggableService
     */
    static async insertMany(dbs, localFiles, dbLocalTaggableService) {
        if (localFiles.length === 0) {
            return [];
        }

        const insertedTaggables = await Taggables.insertMany(dbs, localFiles.map(file => file.Taggable_Name));

        const localFileInsertionParams = [];
        for (let i = 0; i < localFiles.length; ++i) {
            localFileInsertionParams.push(localFiles[i].File_ID);
            localFileInsertionParams.push(Number(insertedTaggables[i].Taggable_ID));
        }

        /** @type {DBLocalFile[]} */
        const insertedDBLocalFiles = await dball(dbs, `
            INSERT INTO Local_Files(
                File_ID,
                Taggable_ID
            ) VALUES ${dbtuples(localFiles.length, 2)} RETURNING *;
            `, localFileInsertionParams
        );
        const mappedInsertedDBLocalFiles = insertedDBLocalFiles.map((dbLocalFile, i) => mapDBLocalFile(dbLocalFile, localFiles[i]));

        await dbs.perfTags.insertTagPairings(new Map([
            [dbLocalTaggableService.In_Local_Taggable_Service_Tag_ID, mappedInsertedDBLocalFiles.map(dbLocalFile => dbLocalFile.Taggable_ID)],
            [IS_FILE_TAG.Tag_ID, mappedInsertedDBLocalFiles.map(dbLocalFile => dbLocalFile.Taggable_ID)],
            ...localFiles.map((localFile, i) => [localFile.Has_File_Extension_Tag_ID, [insertedTaggables[i].Taggable_ID]]),
            ...localFiles.map((localFile, i) => [localFile.Has_File_Hash_Tag_ID, [insertedTaggables[i].Taggable_ID]])
        ]), dbs.inTransaction);

        return mappedInsertedDBLocalFiles;
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertLocalFile[]} preInsertLocalFiles
     * @param {DBLocalTaggableService} dbLocalTaggableService
     */
    static async upsertMany(dbs, preInsertLocalFiles, dbLocalTaggableService) {
        if (preInsertLocalFiles.length === 0) {
            return {
                dbLocalFiles: [],
                finalizeFileMove: async () => {}
            };
        }
        // dedupe
        preInsertLocalFiles = [...(new Map(preInsertLocalFiles.map(localFile => [localFile.File_Hash.toString("hex"), localFile]))).values()];
        const {dbFiles, finalizeFileMove} = await Files.upsertMany(dbs, preInsertLocalFiles);
        const dbFilesHashMap = new Map(dbFiles.map(dbFile => [dbFile.File_Hash.toString("hex"), dbFile]));
        const preparedLocalFiles = preInsertLocalFiles.map(preInsertLocalFile => preparePreInsertLocalFile(preInsertLocalFile, dbFilesHashMap.get(preInsertLocalFile.File_Hash.toString("hex"))));
        
        const dbLocalFiles = await LocalFiles.selectMany(dbs, preparedLocalFiles, dbLocalTaggableService);
        const dbLocalFilesExisting = new Set(dbLocalFiles.map(dbLocalFile => dbLocalFile.File_Hash.toString("hex")));
        const preparedLocalFilesToInsert = preparedLocalFiles.filter(localFile => !dbLocalFilesExisting.has(localFile.File_Hash.toString("hex")));
        const dbLocalFilesInserted = await LocalFiles.insertMany(dbs, preparedLocalFilesToInsert, dbLocalTaggableService);

        return {
            dbLocalFiles: dbLocalFiles.concat(dbLocalFilesInserted),
            finalizeFileMove
        };
    }
}