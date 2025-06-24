import sharp from "sharp";
import { createFileExtensionLookupName, createHasFileHashLookupName, createHasURLTagLookupName, createURLAssociationTagLookupName, IS_FILE_TAG, normalizeFileExtension, normalPreInsertLocalTag, SYSTEM_GENERATED, SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../client/js/user.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";
import {asyncDataSlicer, dball, dballselect, dbBeginTransaction, dbEndTransaction, dbrun, dbtuples, dbvariablelist} from "./db-util.js";
import { userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { LocalTags, UserFacingLocalTags } from "./tags.js";
import { extractFirstFrameWithFFMPEG, sha256 } from "../util.js";
import { readFile } from "fs/promises";
import { AppliedMetrics, appliedMetricsPKHash } from "./metrics.js";
import { createInLocalTaggableServiceLookupName, isInLocalTaggableServiceLookupName, revertInLocalTaggableServiceLookupName } from "../client/js/taggables.js";
import { isAppliedMetricLookupName, revertAppliedMetricLookupName } from "../client/js/metrics.js";

/** @import {User} from "../client/js/user.js" */
/** @import {URLAssociation} from "../client/js/tags.js" */
/** @import {DBAppliedMetric} from "./metrics.js" */
/** @import {DBService} from "./services.js" */
/** @import {DBUser, PermissionInt} from "./user.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {DBJoinedURLAssociation, UserFacingLocalTag} from "./tags.js" */

/**
 * @typedef {Object} DBLocalTaggableService
 * @property {number} Local_Taggable_Service_ID
 * @property {bigint} In_Local_Taggable_Service_Tag_ID
 */

/**
 * @typedef {DBLocalTaggableService & DBService} DBJoinedLocalTaggableService
 */
/** @typedef {DBJoinedLocalTaggableService & {Permission_Extent: PermissionInt}} DBPermissionedLocalTaggableService */

export class LocalTaggableServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localTaggableServiceIDs 
     */
    static async selectTagMappings(dbs, localTaggableServiceIDs) {
        return await LocalTags.selectManyByLookups(dbs, localTaggableServiceIDs.map(localTaggableServiceID => ({
            Lookup_Name: createInLocalTaggableServiceLookupName(localTaggableServiceID),
            Source_Name: SYSTEM_GENERATED
        })));
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localTaggableServiceID 
     */
    static async selectTagMapping(dbs, localTaggableServiceID) {
        return (await LocalTaggableServices.selectTagMappings(dbs, [localTaggableServiceID]))[0];
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

        const taggableServiceIDs = (await LocalTags.selectManyByTagIDs(dbs, [...allTagIDs])).filter(tag => (
            tag.Local_Tag_Service_ID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID
         && isInLocalTaggableServiceLookupName(tag.Lookup_Name)
        )).map(tag => revertInLocalTaggableServiceLookupName(tag.Lookup_Name));

        return await LocalTaggableServices.selectManyByIDs(dbs, [...taggableServiceIDs]);
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

        return localTaggableServices;
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
        return localTaggableServices;
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

        return localTaggableServices;
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
                `, {$userID: user.id()}));
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
     * @param {Map<bigint, URLAssociation[]>} taggableURLAssociationPairings 
     */
    static async upsertURLAssociations(dbs, taggableURLAssociationPairings) {
        /** @type {Set<string>} */
        const allURLAssociationLookupNames = new Set();
        /** @type {Set<string>} */
        const allURLs = new Set();
        for (const urlAssociations of taggableURLAssociationPairings.values()) {
            for (const urlAssociation of urlAssociations) {
                allURLAssociationLookupNames.add(createURLAssociationTagLookupName(urlAssociation));
                allURLs.add(urlAssociation.URL);
            }
        }
        const urlAssociationTagMap = new Map((await LocalTags.upsertMany(dbs, [...allURLAssociationLookupNames.values()].map(urlAssociationLookupName => normalPreInsertLocalTag(
            urlAssociationLookupName,
            SYSTEM_GENERATED
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)).map(urlAssociationTag => [urlAssociationTag.Lookup_Name, urlAssociationTag]));

        const urlMap = new Map((await LocalTags.upsertMany(dbs, [...allURLs].map(url => normalPreInsertLocalTag(
            createHasURLTagLookupName(url),
            SYSTEM_GENERATED
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)).map(tag => [tag.Lookup_Name, tag]));

        const taggableURLAssociationTagPairings = new Map([...taggableURLAssociationPairings.entries()].map(([taggableID, urlAssociations]) => [
            taggableID,
            urlAssociations.map(urlAssociation => urlAssociationTagMap.get(createURLAssociationTagLookupName(urlAssociation)).Tag_ID)
        ]));

        const taggableHasURLTagPairings = new Map([...taggableURLAssociationPairings.entries()].map(([taggableID, urlAssociations]) => [
            taggableID,
            [...new Set(urlAssociations.map(urlAssociation => urlAssociation.URL))].map(url => urlMap.get(createHasURLTagLookupName(url).Tag_ID))
        ]));

        await dbs.perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggableHasURLTagPairings), dbs.inTransaction);
        await dbs.perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggableURLAssociationTagPairings), dbs.inTransaction);
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
        const inLocalTaggableServicesTags = await LocalTags.selectManyByLookups(dbs, taggableServices.map(taggableService => ({
            Lookup_Name: createInLocalTaggableServiceLookupName(taggableService.Local_Taggable_Service_ID),
            Source_Name: SYSTEM_GENERATED
        })), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);
        return await Taggables.search(dbs, searchCriteria, inLocalTaggableServicesTags.map(tag => tag.Tag_ID));
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

    /** @type {Set<string>} */
    const allSystemTagLookupNames = new Set();
    for (const tags of taggablesTags.values()) {
        for (const tag of tags) {
            if (tag.Local_Tag_Service_ID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID) {
                allSystemTagLookupNames.add(tag.Lookup_Name);
            }
        }
    }

    const preInsertAppliedMetrics = [...allSystemTagLookupNames].filter(isAppliedMetricLookupName)
        .map(revertAppliedMetricLookupName)
        .filter(preInsertAppliedMetric => preInsertAppliedMetric.User_ID === userID);
    const appliedMetricsMap = new Map((await AppliedMetrics.tagMapped(dbs, 
        await AppliedMetrics.selectManyByPreInsertAppliedMetrics(dbs, preInsertAppliedMetrics)
    )).map(appliedMetric => [
        appliedMetric.Local_Applied_Metric_Tag.Tag_ID,
        appliedMetric
    ]));

    return dbUserFacingLocalFiles.map(dbUserFacingLocalFile => ({
        ...dbUserFacingLocalFile,
        Tags: taggablesTags.get(dbUserFacingLocalFile.Taggable_ID).filter?.((tag => tag.Local_Tag_Service_ID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)) ?? [],
        Metrics: taggablesTags.get(dbUserFacingLocalFile.Taggable_ID).filter?.(tag => (
            tag.Local_Tag_Service_ID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID
         && isAppliedMetricLookupName(tag.Lookup_Name)
        ))?.map(tag => appliedMetricsMap.get(tag.Tag_ID)) ?? []
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
                   F.File_Extension,
                   T.Taggable_ID,
                   T.Taggable_Name,
                   T.Taggable_Created_Date,
                   T.Taggable_Last_Modified_Date,
                   T.Taggable_Last_Viewed_Date,
                   T.Taggable_Deleted_Date
              FROM Taggables T
              JOIN Local_Files LF ON T.Taggable_ID = LF.Taggable_ID
              JOIN Files F ON LF.File_ID = F.File_ID
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
 *   File_Extension: string
 * }} PreInsertFile
 */

/**
 * @typedef {Object} DBFile
 * @property {number} File_ID
 * @property {Buffer} File_Hash
 * @property {string} File_Extension
 * @property {string?} Prethumbnail_Hash
 * @property {string?} Thumbnail_Hash
 */

export class Files {
    /**
     * @param {Databases} dbs 
     * @param {PreInsertFile[]} files
     */
    static async selectMany(dbs, files) {
        /** @type {DBFile[]} */
        const dbFiles = await dballselect(dbs, `SELECT * FROM Files WHERE File_Hash IN ${dbvariablelist(files.length)}`, files.map(file => file.File_Hash));
        return dbFiles;
    }
    
    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBFile[]} */
        const dbFiles = await dballselect(dbs, "SELECT * FROM Files;");
        return dbFiles;
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

        dbs = await dbBeginTransaction(dbs);

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
            fileInsertionParams.push(files[i].File_Extension);
        }

        /** @type {DBFile[]} */
        const insertedDBFiles = await dball(dbs, `
            INSERT INTO Files(
                File_Hash,
                Thumbnail_Hash,
                Prethumbnail_Hash,
                File_Extension
            ) VALUES ${dbtuples(files.length, 4)} RETURNING *;
            `, fileInsertionParams
        );

        await dbEndTransaction(dbs);

        return {
            dbFiles: insertedDBFiles,
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
     * @param {bigint} inLocalTaggableServiceTagID
     */
    static async selectMany(dbs, localFiles, inLocalTaggableServiceTagID) {
        const hasFileHashTags = await LocalTags.selectManyByLookups(dbs, localFiles.map(localFile => ({
            Lookup_Name: createHasFileHashLookupName(localFile.File_Hash.toString("hex")),
            Source_Name: SYSTEM_GENERATED
        })), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);
        const {taggables} = await dbs.perfTags.search(PerfTags.searchIntersect([
            PerfTags.searchTag(inLocalTaggableServiceTagID),
            PerfTags.searchUnion(hasFileHashTags.map(hasFileHashTag => PerfTags.searchTag(hasFileHashTag.Tag_ID)))
        ]), dbs.inTransaction);

        const dbFileMap = new Map(localFiles.map(dbFile => [dbFile.File_ID, dbFile]));

        /** @type {DBLocalFile[]} */
        const dbLocalFiles = await dballselect(dbs, `SELECT * FROM Local_Files Where Taggable_ID IN ${dbvariablelist(taggables.length)}`, taggables);

        return dbLocalFiles.map(dbLocalFile => mapDBLocalFile(dbLocalFile, dbFileMap.get(dbLocalFile.File_ID)));
    }

    /**
     * @param {Databases} dbs
     * @param {PreparedPreInsertLocalFile[]} localFiles
     * @param {bigint} inLocalTaggableServiceTagID
     */
    static async insertMany(dbs, localFiles, inLocalTaggableServiceTagID) {
        if (localFiles.length === 0) {
            return [];
        }

        dbs = await dbBeginTransaction(dbs);

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

        const fileExtensions = new Set();
        for (const localFile of localFiles) {
            fileExtensions.add(normalizeFileExtension(localFile.File_Extension));
        }
        const fileExtensionTags = new Map((await LocalTags.upsertMany(dbs, [...fileExtensions].map(fileExtension => normalPreInsertLocalTag(
            createFileExtensionLookupName(fileExtension),
            SYSTEM_GENERATED
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)).map(tag => [tag.Lookup_Name, tag]),);

        const hasFileHashTags = new Map((await LocalTags.upsertMany(dbs, localFiles.map(localFile => normalPreInsertLocalTag(
            createHasFileHashLookupName(localFile.File_Hash.toString("hex")),
            SYSTEM_GENERATED
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)).map(tag => [tag.Lookup_Name, tag]));

        await dbs.perfTags.insertTagPairings(new Map([
            [inLocalTaggableServiceTagID, mappedInsertedDBLocalFiles.map(dbLocalFile => dbLocalFile.Taggable_ID)],
            [IS_FILE_TAG.Tag_ID, mappedInsertedDBLocalFiles.map(dbLocalFile => dbLocalFile.Taggable_ID)],
            ...localFiles.map((localFile, i) => [fileExtensionTags.get(createFileExtensionLookupName(localFile.File_Extension)).Tag_ID, [insertedTaggables[i].Taggable_ID]]),
            ...localFiles.map((localFile, i) => [hasFileHashTags.get(createHasFileHashLookupName(localFile.File_Hash.toString("hex"))).Tag_ID, [insertedTaggables[i].Taggable_ID]])
        ]), dbs.inTransaction);

        await dbEndTransaction(dbs);

        return mappedInsertedDBLocalFiles;
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertLocalFile[]} preInsertLocalFiles
     * @param {DBLocalTaggableService} inLocalTaggableServiceTagID
     */
    static async upsertMany(dbs, preInsertLocalFiles, inLocalTaggableServiceTagID) {
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
        
        const dbLocalFiles = await LocalFiles.selectMany(dbs, preparedLocalFiles, inLocalTaggableServiceTagID);
        const dbLocalFilesExisting = new Set(dbLocalFiles.map(dbLocalFile => dbLocalFile.File_Hash.toString("hex")));
        const preparedLocalFilesToInsert = preparedLocalFiles.filter(localFile => !dbLocalFilesExisting.has(localFile.File_Hash.toString("hex")));
        const dbLocalFilesInserted = await LocalFiles.insertMany(dbs, preparedLocalFilesToInsert, inLocalTaggableServiceTagID);

        return {
            dbLocalFiles: dbLocalFiles.concat(dbLocalFilesInserted),
            finalizeFileMove
        };
    }
}