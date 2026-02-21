import sharp from "sharp";
import { AUDIO_DIMENSIONS_METRIC, AUDIO_SAMPLE_RATE_METRIC, AUDIO_SIZE_METRIC, DURATION_METRIC, FILE_SIZE_METRIC, FRAME_COUNT_METRIC, HAS_EXIF_TAG, HAS_ICC_PROFILE_TAG, HAS_METADATA_TAG, HAS_TRANSPARENCY_TAG, HEIGHT_METRIC, IN_TRASH_TAG, IS_FILE_TAG, SYSTEM_LOCAL_TAG_SERVICE, VIDEO_SIZE_METRIC, WIDTH_METRIC } from "../client/js/defaults.js";
import { createFileExtensionLookupName, createHasFileHashLookupName, createHasURLTagLookupName, createURLAssociationTagLookupName, isURLAssociationTagLookupName, normalizeFileExtension,revertURLAssociationTagLookupName } from "../client/js/tags.js";
import { PERMISSIONS } from "../client/js/user.js";
import PerfTags from "../perf-binding/perf-tags.js";
import {asyncDataSlicer, dball, dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun, dbtuples, dbvariablelist, TMP_FOLDER} from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { LocalTags, UserFacingLocalTags } from "./tags.js";
import { AppliedMetrics } from "./metrics.js";
import { extractMetadataWithFFProbe, extractNthSecondWithFFMPEG, sha256 } from "../util.js";
import { readFile, rm } from "fs/promises";
import { createInLocalTaggableServiceLookupName, isInLocalTaggableServiceLookupName, revertInLocalTaggableServiceLookupName } from "../client/js/taggables.js";
import { createSystemAppliedMetric, isAppliedMetricLookupName, revertAppliedMetricLookupName } from "../client/js/metrics.js";
import path from "path";
import { mapNullCoalesce } from "../client/js/client-util.js";

/** @import {User} from "../client/js/user.js" */
/** @import {URLAssociation} from "../client/js/tags.js" */
/** @import {DBAppliedMetric, PreInsertLocalMetric} from "./metrics.js" */
/** @import {DBService} from "./services.js" */
/** @import {DBUser} from "./user.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {DBLocalTag, UserFacingLocalTag, UserFacingLocalTagGroup} from "./tags.js" */
/** @import {DBPermissionedLocalMetricService} from "./metrics.js" */

/**
 * @typedef {Object} DBLocalTaggableService
 * @property {number} Local_Taggable_Service_ID
 */

/**
 * @typedef {DBLocalTaggableService & DBService} DBJoinedLocalTaggableService
 */

/**
 * @typedef {DBJoinedLocalTaggableService & {In_Local_Taggable_Service_Tag: DBLocalTag}} TagMappedDBJoinedLocalTaggableService
 */

/** @typedef {DBJoinedLocalTaggableService & {Permissions: Set<string>}} DBPermissionedLocalTaggableService */

export class LocalTaggableServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localTaggableServiceIDs
     */
    static async selectTagMappings(dbs, localTaggableServiceIDs) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, localTaggableServiceIDs.map(createInLocalTaggableServiceLookupName));
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
     * @param {DBJoinedLocalTaggableService[]} localTaggableServices
     */
    static async tagMapped(dbs, localTaggableServices) {
        const localTaggableServicesTags = await LocalTaggableServices.selectTagMappings(dbs, localTaggableServices.map(localTaggableService => localTaggableService.Local_Taggable_Service_ID));

        if (localTaggableServicesTags.length !== localTaggableServices.length) {
            throw "Differing tags to local taggable services";
        }

        return localTaggableServices.map((localTaggableServices, i) => ({
            ...localTaggableServices,
            In_Local_Taggable_Service_Tag: localTaggableServicesTags[i]
        }));
    }

    /**
     * @param {Databases} dbs 
     * @param {DBJoinedLocalTaggableService} localTaggableService 
     */
    static async tagMap(dbs, localTaggableService) {
        return (await LocalTaggableServices.tagMapped(dbs, [localTaggableService]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs
     */
    static async selectMappedByTaggableIDs(dbs, taggableIDs) {
        const allLocalTaggableServicesMap = new Map((await LocalTaggableServices.tagMapped(dbs, await LocalTaggableServices.selectAll(dbs))).map(localTaggableService => [
            localTaggableService.In_Local_Taggable_Service_Tag.Tag_ID,
            localTaggableService
        ]));

        const {taggablePairings} = await dbs.perfTags.readTaggablesSpecifiedTags(
            taggableIDs,
            [...allLocalTaggableServicesMap.keys()],
            dbs.inTransaction
        );

        return new Map(
            [...taggablePairings].map(([taggable, inLocalTaggableServiceTagID]) => [
                taggable,
                allLocalTaggableServicesMap.get(inLocalTaggableServiceTagID[0])
            ])
        );
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs
     */
    static async selectManyByTaggableIDs(dbs, taggableIDs) {
        let allTaggablesExist = true;

        /** @type {Map<bigint, DBJoinedLocalTaggableService>} */
        const localTaggableServicesMap = new Map();
        for (const localTaggableService of (await LocalTaggableServices.selectMappedByTaggableIDs(dbs, taggableIDs)).values()) {
            if (localTaggableService === undefined) {
                allTaggablesExist = false;
                continue;
            }

            localTaggableServicesMap.set(localTaggableService.Local_Taggable_Service_ID, localTaggableService);
        }
        
        return {
            allTaggablesExist,
            localTaggableServices: [...localTaggableServicesMap.values()]
        };
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint} taggableID 
     */
    static async selectByTaggableID(dbs, taggableID) {
        return (await LocalTaggableServices.selectManyByTaggableIDs(dbs, [taggableID])).localTaggableServices[0];
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
     * @param {number} localTaggableServiceID
     */
    static async selectByID(dbs, localTaggableServiceID) {
        return (await LocalTaggableServices.selectManyByIDs(dbs, [localTaggableServiceID]))[0];
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
     * @param {string[]} permissionsToCheck
     * @param {number[]} localTaggableServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionsToCheck, localTaggableServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionsToCheck)) {
            return await LocalTaggableServices.selectManyByIDs(dbs, localTaggableServiceIDs);
        }

        /** @type {DBJoinedLocalTaggableService[]} */
        const localTaggableServices = await dballselect(dbs, `
            SELECT LTS.*, S.*
            FROM Local_Taggable_Services LTS
            JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
            JOIN Services S ON LTS.Service_ID = S.Service_ID
            WHERE (
                SELECT COUNT(1)
                FROM Services_Users_Permissions SUP
                WHERE LTS.Service_ID = SUP.Service_ID
                AND SUP.User_ID = ?
                AND SUP.Permission IN ${dbvariablelist(permissionsToCheck.length)}
            ) = ?
            AND LTS.Local_Taggable_Service_ID IN ${dbvariablelist(localTaggableServiceIDs.length)};
        `, [
            user.id(),
            permissionsToCheck,
            permissionsToCheck.length,
            ...localTaggableServiceIDs
        ]);

        return localTaggableServices;
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]} permissionsToCheck 
     * @param {number} localTaggableServiceID
     */
    static async userSelectByID(dbs, user, permissionsToCheck, localTaggableServiceID) {
        return (await LocalTaggableServices.userSelectManyByIDs(dbs, user, permissionsToCheck, [localTaggableServiceID]))[0];
    }
    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]=} permissionsToCheck
     */
    static async userSelectAll(dbs, user, permissionsToCheck) {
        return await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            LocalTaggableServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT LTS.Local_Taggable_Service_ID, SUP.Permission
                      FROM Local_Taggable_Services LTS
                      JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
                     WHERE SUP.User_ID = ?;
                `, [user.id()]);
            },
            "Local_Taggable_Service_ID",
            permissionsToCheck
        );
    }

    /**
     * @param {Databases} dbs
     * @param {number} userID
     * @param {string} serviceName
     */
    static async userInsert(dbs, userID, serviceName) {
        dbs = await dbBeginTransaction(dbs);

        const serviceID = await Services.insert(dbs, serviceName);
        await ServicesUsersPermissions.insertMany(dbs, serviceID, userID, Object.values(PERMISSIONS.LOCAL_TAGGABLE_SERVICES).map(permission => permission.name));

        /** @type {number} */
        const localTaggableServiceID = (await dbget(dbs, `
            INSERT INTO Local_Taggable_Services(
                Service_ID
            ) VALUES (
                ?
            ) RETURNING Local_Taggable_Service_ID;
        `, [serviceID])).Local_Taggable_Service_ID;
        
        await LocalTags.insertSystemTag(dbs, createInLocalTaggableServiceLookupName(localTaggableServiceID));

        await dbEndTransaction(dbs);

        return localTaggableServiceID;
    }
    
    /**
     * @param {Databases} dbs
     * @param {number} localTaggableServiceID
     * @param {string} serviceName
     */
    static async update(dbs, localTaggableServiceID, serviceName) {
        const localTaggableService = await LocalTaggableServices.selectByID(dbs, localTaggableServiceID);
        await Services.update(dbs, localTaggableService.Service_ID, serviceName);

        return localTaggableServiceID;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localTaggableServiceID 
     */
    static async deleteByID(dbs, localTaggableServiceID) {
        dbs = await dbBeginTransaction(dbs);

        const localTaggableService = await LocalTaggableServices.tagMap(dbs, await LocalTaggableServices.selectByID(dbs, localTaggableServiceID));
        await Services.deleteByID(dbs, localTaggableService.Service_ID);

        const localTaggableServiceTaggables = await Taggables.search(dbs, "", [localTaggableService.In_Local_Taggable_Service_Tag.Tag_ID]);
        await Taggables.deleteManyByIDs(dbs, localTaggableServiceTaggables.map(taggable => taggable.Taggable_ID));
        await LocalTags.deleteSystemTag(dbs, createInLocalTaggableServiceLookupName(localTaggableServiceID));
        await dbrun(dbs, "DELETE FROM Local_Taggable_Services WHERE Local_Taggable_Service_ID = ?;", [localTaggableServiceID]);

        await dbEndTransaction(dbs);
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
     * @param {boolean=} inTrash
     * @returns {Promise<DBTaggable[]>}
     */
    static async selectManyByIDs(dbs, taggableIDs, inTrash) {
        inTrash ??= true;
        if (taggableIDs.length === 0) {
            return [];
        }
        if (taggableIDs.length > 10000) {
            const slices = await asyncDataSlicer(taggableIDs, 10000, (sliced) => Taggables.selectManyByIDs(dbs, sliced, inTrash));
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
    static async uniqueInsertURLAssociations(dbs, taggableURLAssociationPairings) {
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
        const urlAssociationTagMap = new Map((await LocalTags.uniqueInsertManySystemTags(dbs, [...allURLAssociationLookupNames])).map(urlAssociationTag => [urlAssociationTag.Lookup_Name, urlAssociationTag]));
        const urlMap = new Map((await LocalTags.uniqueInsertManySystemTags(dbs, [...allURLs].map(createHasURLTagLookupName))).map(tag => [tag.Lookup_Name, tag]));

        const taggableURLAssociationTagPairings = new Map([...taggableURLAssociationPairings.entries()].map(([taggableID, urlAssociations]) => [
            taggableID,
            urlAssociations.map(urlAssociation => urlAssociationTagMap.get(createURLAssociationTagLookupName(urlAssociation)).Tag_ID)
        ]));

        const taggableHasURLTagPairings = new Map([...taggableURLAssociationPairings.entries()].map(([taggableID, urlAssociations]) => [
            taggableID,
            [...new Set(urlAssociations.map(urlAssociation => urlAssociation.URL))].map(url => urlMap.get(createHasURLTagLookupName(url)).Tag_ID)
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
     */
    static async forceSearch(dbs, searchCriteria) {
        const {taggables} = await dbs.perfTags.search(searchCriteria, dbs.inTransaction);
        return await Taggables.selectManyByIDs(dbs, taggables);
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

        return await Taggables.forceSearch(dbs, constructedSearch);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {string} searchCriteria
     * @param {User} user
     */
    static async searchWithUser(dbs, searchCriteria, user) {
        const taggableServices = await LocalTaggableServices.userSelectAll(dbs, user, PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES);
        const inLocalTaggableServicesTags = await LocalTaggableServices.selectTagMappings(dbs, taggableServices.map(taggableService => taggableService.Local_Taggable_Service_ID));
        return await Taggables.search(dbs, searchCriteria, inLocalTaggableServicesTags.map(tag => tag.Tag_ID));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     */
    static async deleteManyByIDs(dbs, taggableIDs) {
        if (taggableIDs.length === 0) {
            return;
        }

        
        if (taggableIDs.length > 10000) {
            dbs = await dbBeginTransaction(dbs);
            const slices = await asyncDataSlicer(taggableIDs, 10000, (sliced) => Taggables.deleteManyByIDs(dbs, sliced));
            await dbEndTransaction(dbs);
            return slices.flat();
        }

        dbs = await dbBeginTransaction(dbs);

        await TaggableFiles.deleteManyByTaggableIDs(dbs, taggableIDs);
        await dbs.perfTags.deleteTaggables(taggableIDs, dbs.inTransaction);
        await dbrun(dbs, `DELETE FROM Taggables WHERE Taggable_ID IN ${dbvariablelist(taggableIDs.length)}`, taggableIDs.map(Number));

        await dbEndTransaction(dbs);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     */
    static async trashManyByIDs(dbs, taggableIDs) {
        if (taggableIDs.length === 0) {
            return;
        }

        if (taggableIDs.length > 10000) {
            dbs = await dbBeginTransaction(dbs);
            await asyncDataSlicer(taggableIDs, 10000, (sliced) => Taggables.trashManyByIDs(dbs, sliced));
            await dbEndTransaction(dbs);
            return;
        }

        await dbs.perfTags.insertTagPairings(new Map([[IN_TRASH_TAG.Tag_ID, taggableIDs]]), dbs.inTransaction);
        await dbrun(dbs, `
            UPDATE Taggables
            SET Taggable_Deleted_Date = unixepoch('now')
            WHERE Taggable_ID IN ${dbvariablelist(taggableIDs.length)}
            `, taggableIDs.map(Number)
        );
    }
}

/**
 * @typedef {Object} DBUserFacingTaggableFile
 * @property {number} Taggable_File_ID
 * @property {string} File_Hash
 * @property {string} File_Extension
 * @property {bigint} Taggable_ID
 * @property {string} Taggable_Name
 * @property {number} Taggable_Created_Date
 * @property {number} Taggable_Last_Modified_Date
 * @property {number} Taggable_Last_Viewed_Date
 * @property {number} Taggable_Deleted_Date
 * @property {number} Local_Taggable_Service_ID
 * @property {URLAssociation[]} URL_Associations
 * @property {UserFacingLocalTagGroup[]} Tag_Groups
 * @property {(DBAppliedMetric & {Local_Metric_Service_ID: number})[]} Metrics
 */

/**
 * @param {Databases} dbs
 * @param {Omit<DBUserFacingTaggableFile, "Tags">[]} dbUserFacingTaggableFiles
 * @param {number} userID
 * @param {number[]} localTagServiceIDs
 * @param {DBPermissionedLocalMetricService[]} localMetricServices
 */
async function mapDBUserFacingTaggableFiles(dbs, dbUserFacingTaggableFiles, userID, localTagServiceIDs, localMetricServices) {
    dbUserFacingTaggableFiles = dbUserFacingTaggableFiles.map(dbUserFacingTaggableFile => ({
        ...dbUserFacingTaggableFile,
        Taggable_ID: BigInt(dbUserFacingTaggableFile.Taggable_ID)
    }));

    const taggableIDs = dbUserFacingTaggableFiles.map(dbUserFacingTaggableFile => dbUserFacingTaggableFile.Taggable_ID);
    const taggablesTags = await UserFacingLocalTags.selectMappedByTaggableIDs(
        dbs,
        taggableIDs,
        [SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, ...localTagServiceIDs],
        PerfTags.SEARCH_EMPTY_SET
    );

    /** @type {Map<number, number>} */
    const localMetricIDToLocalMetricServiceIDMap = new Map();
    for (const localMetricService of localMetricServices) {
        for (const localMetric of localMetricService.Local_Metrics) {
            localMetricIDToLocalMetricServiceIDMap.set(localMetric.Local_Metric_ID, localMetricService.Local_Metric_Service_ID);
        }
    }

    /** @type {Map<bigint, (PreInsertLocalMetric & {Local_Metric_Service_ID: number})[]>} */
    const taggableAppliedMetrics = new Map();
    /** @type {Map<bigint, number>} */
    const taggableLocalTaggableServiceID = new Map();
    /** @type {Map<bigint, URLAssociation[]>} */
    const taggableURLAssociations = new Map();
    for (const [taggableID, tagGroups] of taggablesTags) {
        const filteredTagGroups = [];
        for (const tagGroup of tagGroups) {
            let wasSystemTag = false;
            for (const tag of tagGroup.tags) {
                if (tag.Local_Tag_Service_ID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID) {
                    wasSystemTag = true;
                    if (isAppliedMetricLookupName(tag.Lookup_Name)) {
                        const appliedMetrics = mapNullCoalesce(taggableAppliedMetrics, taggableID, []);
                        const appliedMetric = revertAppliedMetricLookupName(tag.Lookup_Name);
                        if (appliedMetric.User_ID !== userID || !localMetricIDToLocalMetricServiceIDMap.has(appliedMetric.Local_Metric_ID)) {
                            continue;
                        }

                        appliedMetrics.push({
                            ...appliedMetric,
                            Local_Metric_Service_ID: localMetricIDToLocalMetricServiceIDMap.get(appliedMetric.Local_Metric_ID)
                        });
                    } else if (isInLocalTaggableServiceLookupName(tag.Lookup_Name)) {
                        taggableLocalTaggableServiceID.set(taggableID, revertInLocalTaggableServiceLookupName(tag.Lookup_Name));
                    } else if (isURLAssociationTagLookupName(tag.Lookup_Name)) {
                        const urlAssociations = mapNullCoalesce(taggableURLAssociations, taggableID, []);
                        urlAssociations.push(revertURLAssociationTagLookupName(tag.Lookup_Name));
                    }
                }
            }

            if (!wasSystemTag) {
                filteredTagGroups.push(tagGroup);
            }
        }

        taggablesTags.set(taggableID, filteredTagGroups);
    }

    return dbUserFacingTaggableFiles.map(dbUserFacingTaggableFile => ({
        ...dbUserFacingTaggableFile,
        Local_Taggable_Service_ID:  taggableLocalTaggableServiceID.get(dbUserFacingTaggableFile.Taggable_ID),
        URL_Associations: taggableURLAssociations.get(dbUserFacingTaggableFile.Taggable_ID) ?? [],
        Tag_Groups: taggablesTags.get(dbUserFacingTaggableFile.Taggable_ID) ?? [],
        Metrics: taggableAppliedMetrics.get(dbUserFacingTaggableFile.Taggable_ID) ?? []
    }));
}

export class UserFacingTaggableFiles {
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {Omit<DBUserFacingTaggableFile, "Tags">[]} dbUserFacingTaggableFiles
     * @param {number} userID
     * @param {number[]} localTagServiceIDs
     * @param {DBPermissionedLocalMetricService[]} localMetricServices
     * @returns {Promise<DBUserFacingTaggableFile[]>}
     */
    static async selectManyByTaggableIDs(dbs, taggableIDs, userID, localTagServiceIDs, localMetricServices) {
        if (taggableIDs.length === 0) {
            return [];
        }
        if (taggableIDs.length > 10000) {
            const slices = await asyncDataSlicer(taggableIDs, 10000, (sliced) => UserFacingTaggableFiles.selectManyByTaggableIDs(dbs, sliced, userID, localTagServiceIDs, localMetricServices));
            return slices.flat();
        }

        /** @type {Omit<DBUserFacingTaggableFile, "Tags">[]} */
        const dbUserFacingTaggableFiles = await dballselect(dbs, `
            SELECT TF.Taggable_File_ID,
                   LOWER(HEX(F.File_Hash)) AS File_Hash,
                   F.File_Extension,
                   T.Taggable_ID,
                   T.Taggable_Name,
                   T.Taggable_Created_Date,
                   T.Taggable_Last_Modified_Date,
                   T.Taggable_Last_Viewed_Date,
                   T.Taggable_Deleted_Date
              FROM Taggables T
              JOIN Taggable_Files TF ON T.Taggable_ID = TF.Taggable_ID
              JOIN Files F ON TF.File_ID = F.File_ID
                AND TF.Taggable_ID IN ${dbvariablelist(taggableIDs.length)};
        `, [...taggableIDs.map(taggableID => Number(taggableID))]
        );

        return await mapDBUserFacingTaggableFiles(dbs, dbUserFacingTaggableFiles, userID, localTagServiceIDs, localMetricServices);
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
 * @property {Buffer} Perceptual_Hash
 * @property {number} Perceptual_Hash_Version
 * @property {Buffer} Exact_Bitmap_Hash
 * @property {string?} Prethumbnail_Hash
 * @property {string?} Thumbnail_Hash
 * @property {number} File_Size
 * @property {number} Video_Size
 * @property {number} Frame_Count
 * @property {number=} Width
 * @property {number=} Height
 * @property {number=} Duration
 * @property {number} Audio_Size
 * @property {number=} Audio_Dimensions
 * @property {number=} Audio_Sample_Rate
 * @property {number} Has_Transparency
 * @property {number} Has_Metadata
 * @property {number} Has_ICC_Profile
 * @property {number} Has_EXIF
 **/

export class Files {
    /**
     * @param {Databases} dbs
     * @param {string} sourceLocation 
     * @param {Buffer} fileHash 
     * @param {string} fileExtension 
     */
    static getTrueSourceLocation(dbs, sourceLocation, fileHash, fileExtension) {
        if (sourceLocation === Files.IN_DATABASE_SOURCE_LOCATION) {
            sourceLocation = dbs.fileStorage.getFilePath(`${fileHash.toString("hex")}${fileExtension}`, fileHash);
        }
        return sourceLocation;
    }

    /**
     * @param {Databases} dbs 
     * @param {DBFile} file 
     */
    static getLocation(dbs, file) {
        return dbs.fileStorage.getFilePath(`${file.File_Hash.toString("hex")}${file.File_Extension}`, file.File_Hash);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} files
     */
    static async selectManyByIDs(dbs, fileIDs) {
        /** @type {DBFile[]} */
        const dbFiles = await dballselect(dbs, `SELECT * FROM Files WHERE File_ID IN ${dbvariablelist(fileIDs.length)}`, fileIDs);
        return dbFiles;
    }

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
     * @param {number} perceptualHashVersion
     */
    static async selectAllWithPerceptualHashVersion(dbs, perceptualHashVersion) {
        /** @type {DBFile[]} */
        const dbFiles = await dballselect(dbs, "SELECT * FROM Files WHERE Perceptual_Hash_Version = ?;", [perceptualHashVersion]);
        return dbFiles;
    }

    static IN_DATABASE_SOURCE_LOCATION = 1n;

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

        const fileToSourceLocationMap = new Map(files.map(file => [
            file.File_Hash.toString("hex"),
            Files.getTrueSourceLocation(dbs, file.sourceLocation, file.File_Hash, file.File_Extension)
        ]));

        dbs = await dbBeginTransaction(dbs);

        /**
         * @type {{
         *     thumbnailLocation: string,
         *     Thumbnail_Hash: Buffer,
         *     Prethumbnail_Hash: Buffer,
         *     File_Size: number,
         *     Video_Size: number
         *     Width?: number
         *     Height?: number
         *     Frame_Count: number
         *     Duration?: number
         *     Audio_Size: number
         *     Audio_Dimensions?: number
         *     Audio_Sample_Rate?: number
         *     Has_Transparency: boolean
         *     Has_Metadata: boolean
         *     Has_ICC_Profile: boolean
         *     Has_EXIF: boolean
         * }[]}
         **/
        const extraFileInfos = [];
        sharp.cache({files: 0});
        const extraFileInfoPromises = [];
        for (let i = 0; i < files.length; ++i) {
            extraFileInfoPromises.push((async () => {
                extraFileInfos[i] = {};
                const file = files[i];

                const sourceLocation = fileToSourceLocationMap.get(file.File_Hash.toString("hex"));
                let sourceBaseName = path.basename(sourceLocation);
                const sharpOutputLocation = path.join(TMP_FOLDER, `${sourceBaseName}.thumb.jpg`);

                const sourceFileContents = await readFile(sourceLocation);
                extraFileInfos[i].File_Size = sourceFileContents.byteLength;

                const ffprobeMetadata = await extractMetadataWithFFProbe(sourceLocation);
                extraFileInfos[i].Video_Size = ffprobeMetadata.videoSize;
                extraFileInfos[i].Frame_Count = ffprobeMetadata.frames;
                extraFileInfos[i].Width = ffprobeMetadata.width;
                extraFileInfos[i].Height = ffprobeMetadata.height;
                extraFileInfos[i].Duration = ffprobeMetadata.duration;
                extraFileInfos[i].Audio_Size = ffprobeMetadata.audioSize;
                extraFileInfos[i].Audio_Dimensions = ffprobeMetadata.channelCount;
                extraFileInfos[i].Audio_Sample_Rate = ffprobeMetadata.sampleRate;

                extraFileInfos[i].Has_Transparency = false;
                extraFileInfos[i].Has_Metadata = false;
                extraFileInfos[i].Has_ICC_Profile = false;
                extraFileInfos[i].Has_EXIF = false;

                const createSharpData = async (sharpInput) => {
                    const sharpImage = sharp(sharpInput);

                    const sharpMetadata = await sharpImage.metadata();
                    if (sharpMetadata !== undefined) {
                        extraFileInfos[i].Has_Metadata = true;
                        extraFileInfos[i].Has_ICC_Profile = sharpMetadata.icc !== undefined;
                        extraFileInfos[i].Has_EXIF = sharpMetadata.exif !== undefined;
                        if (sharpMetadata.hasAlpha) {
                            const pixels = await sharpImage.raw().toBuffer();
                            for (let i = 3; i < pixels.byteLength; i += 4) {
                                if (pixels[i] < 255) {
                                    extraFileInfos[i].Has_Transparency = true;
                                    break;
                                }
                            }
                        }
                    }


                    await sharpImage.resize(300, 200, {fit: "inside"})
                    .jpeg({force: true})
                    .toFile(sharpOutputLocation);
                    const thumbnailFileContents = await readFile(sharpOutputLocation);

                    extraFileInfos[i].thumbnailLocation = sharpOutputLocation;
                    extraFileInfos[i].Thumbnail_Hash = sha256(thumbnailFileContents);
                };

                try {
                    await createSharpData(sourceFileContents);
                } catch {
                    const preThumbnailLocation = path.join(TMP_FOLDER, `/${sourceBaseName}.prethumb.jpg`);
                    const success = await extractNthSecondWithFFMPEG(sourceLocation, 0, preThumbnailLocation);
                    if (success) {
                        extraFileInfos[i].Prethumbnail_Hash = sha256(await readFile(preThumbnailLocation));
                        // no try block, cause this should not fail, if it does fail I want a crash
                        await createSharpData(preThumbnailLocation);
                        await rm(preThumbnailLocation, {force: true});
                    }
                }
            })());
        }

        await Promise.all(extraFileInfoPromises);

        const fileInsertionParams = [];
        for (let i = 0; i < files.length; ++i) {
            fileInsertionParams.push(files[i].File_Hash);
            fileInsertionParams.push(files[i].File_Extension);
            fileInsertionParams.push(extraFileInfos[i].Thumbnail_Hash);
            fileInsertionParams.push(extraFileInfos[i].Prethumbnail_Hash);
            fileInsertionParams.push(extraFileInfos[i].File_Size);
            fileInsertionParams.push(extraFileInfos[i].Video_Size);
            fileInsertionParams.push(extraFileInfos[i].Frame_Count);
            fileInsertionParams.push(extraFileInfos[i].Width);
            fileInsertionParams.push(extraFileInfos[i].Height);
            fileInsertionParams.push(extraFileInfos[i].Duration);
            fileInsertionParams.push(extraFileInfos[i].Audio_Size);
            fileInsertionParams.push(extraFileInfos[i].Audio_Dimensions);
            fileInsertionParams.push(extraFileInfos[i].Audio_Sample_Rate);
            fileInsertionParams.push(extraFileInfos[i].Has_Transparency);
            fileInsertionParams.push(extraFileInfos[i].Has_Metadata);
            fileInsertionParams.push(extraFileInfos[i].Has_ICC_Profile);
            fileInsertionParams.push(extraFileInfos[i].Has_EXIF);
        }

        /** @type {DBFile[]} */
        const insertedDBFiles = await dball(dbs, `
            INSERT INTO Files(
                File_Hash,
                File_Extension,
                Thumbnail_Hash,
                Prethumbnail_Hash,
                
                File_Size,
                Video_Size,
                Frame_Count,
                Width,
                Height,
                Duration,
                Audio_Size,
                Audio_Dimensions,
                Audio_Sample_Rate,

                Has_Transparency,

                Has_Metadata,
                Has_ICC_Profile,
                Has_EXIF
            ) VALUES ${dbtuples(files.length, 17)} RETURNING *;
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

                    const thumbnailLocation = extraFileInfos[i].thumbnailLocation;
                    if (thumbnailLocation !== undefined) {
                        await dbs.fileStorage.move(`${thumbnailLocation}`,
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
    static async uniqueInsertMany(dbs, files) {
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
 * @typedef {PreInsertFile & {Taggable_Name: string}} PreInsertTaggableFile
 * @typedef {PreInsertTaggableFile & DBFile} PreparedPreInsertTaggableFile
 */

/**
 * @param {PreInsertTaggableFile} preInsertTaggableFile 
 * @param {DBFile} dbFile 
 */
function preparePreInsertTaggableFile(preInsertTaggableFile, dbFile) {
    return {
        ...preInsertTaggableFile,
        ...dbFile
    };
}


/**
 * @typedef {Object} DBTaggableFile
 * @property {number} Taggable_File_ID
 * @property {number} File_ID
 * @property {bigint} Taggable_ID
 */

/**
 * @typedef {DBFile & DBTaggableFile} DBJoinedTaggableFile
 */
/** @typedef {Omit<DBJoinedTaggableFile, "Taggable_ID"> & {Taggable_IDs: bigint[]}} TaggableGroupedDBJoinedTaggableFile */

/**
 * @param {DBTaggableFile} dbTaggableFile 
 * @param {DBFile} dbFile
 */
function mapDBTaggableFile(dbTaggableFile, dbFile) {
    return {
        ...dbTaggableFile,
        ...dbFile,
        Taggable_ID: BigInt(dbTaggableFile.Taggable_ID)
    };
}

export class TaggableFiles {
    /**
     * @param {DBJoinedTaggableFile[]} taggableFiles 
     */
    static groupTaggableFilesTaggables(taggableFiles) {
        /** @type {Map<number, TaggableGroupedDBJoinedTaggableFile>} */
        let taggableFilesMap = new Map();
        for (const taggableFile of taggableFiles) {
            const mapFile = mapNullCoalesce(taggableFilesMap, taggableFile.File_ID, {
                ...taggableFile,
                Taggable_IDs: []
            });
            mapFile.Taggable_IDs.push(taggableFile.Taggable_ID);
        }
        return [...taggableFilesMap.values()];
    }

    /**
     * @param {Databases} dbs
     * @param {PreparedPreInsertTaggableFile[]} taggableFiles
     * @param {bigint} inLocalTaggableServiceTagID
     */
    static async selectMany(dbs, taggableFiles, inLocalTaggableServiceTagID) {
        if (taggableFiles.length === 0) {
            return [];
        }

        const hasFileHashTags = await LocalTags.selectManySystemTagsByLookupNames(dbs, taggableFiles.map(taggableFile => createHasFileHashLookupName(taggableFile.File_Hash.toString("hex"))));

        const {taggables} = await dbs.perfTags.search(PerfTags.searchIntersect([
            PerfTags.searchTag(inLocalTaggableServiceTagID),
            PerfTags.searchUnion(hasFileHashTags.map(hasFileHashTag => PerfTags.searchTag(hasFileHashTag.Tag_ID)))
        ]), dbs.inTransaction);

        if (taggables.length === 0) {
            return [];
        }

        const dbFileMap = new Map(taggableFiles.map(dbFile => [dbFile.File_ID, dbFile]));

        /** @type {DBTaggableFile[]} */
        const dbTaggableFiles = await dballselect(dbs, `SELECT * FROM Taggable_Files WHERE Taggable_ID IN ${dbvariablelist(taggables.length)}`, taggables);

        return dbTaggableFiles.map(dbTaggableFile => mapDBTaggableFile(dbTaggableFile, dbFileMap.get(dbTaggableFile.File_ID)));
    }

    /**
     * @param {Databases} dbs
     * @param {string[]} taggableFileHashes
     * @param {bigint} inLocalTaggableServiceTagID
     */
    static async selectManyByHashes(dbs, taggableFileHashes, inLocalTaggableServiceTagID) {
        if (taggableFileHashes.length === 0) {
            return [];
        }

        const hasFileHashTags = await LocalTags.selectManySystemTagsByLookupNames(dbs, taggableFileHashes.map(taggableFileHash => createHasFileHashLookupName(taggableFileHash)));

        const {taggables} = await dbs.perfTags.search(PerfTags.searchIntersect([
            PerfTags.searchTag(inLocalTaggableServiceTagID),
            PerfTags.searchUnion(hasFileHashTags.map(hasFileHashTag => PerfTags.searchTag(hasFileHashTag.Tag_ID)))
        ]), dbs.inTransaction);

        return await TaggableFiles.selectManyByTaggableIDs(taggables);
    }

    /**
     * @param {Databases} dbs
     * @param {number[]} fileIDs
     */
    static async selectManyByFileIDs(dbs, fileIDs) {
        if (fileIDs.length === 0) {
            return [];
        }

        /** @type {DBJoinedTaggableFile[]} */
        const dbJoinedTaggableFiles = await dballselect(dbs, `
            SELECT TF.*, F.*
              FROM Taggable_Files TF
              JOIN Files F ON TF.File_ID = F.File_ID
              WHERE F.File_ID IN ${dbvariablelist(fileIDs.length)}
        `, fileIDs.map(Number));

        return dbJoinedTaggableFiles.map(dbJoinedTaggableFile => mapDBTaggableFile(dbJoinedTaggableFile, dbJoinedTaggableFile));
    }

    /**
     * @param {Databases} dbs
     * @param {bigint[]} taggableIDs
     */
    static async selectManyByTaggableIDs(dbs, taggableIDs) {
        if (taggableIDs.length === 0) {
            return [];
        }

        /** @type {DBJoinedTaggableFile[]} */
        const dbJoinedTaggableFiles = await dballselect(dbs, `
            SELECT TF.*, F.*
              FROM Taggable_Files TF
              JOIN Files F ON TF.File_ID = F.File_ID
              WHERE Taggable_ID IN ${dbvariablelist(taggableIDs.length)}
        `, taggableIDs.map(Number));

        return dbJoinedTaggableFiles.map(dbJoinedTaggableFile => mapDBTaggableFile(dbJoinedTaggableFile, dbJoinedTaggableFile));
    }

    /**
     * @param {Databases} dbs
     * @param {PreparedPreInsertTaggableFile[]} taggableFiles
     * @param {bigint} inLocalTaggableServiceTagID
     */
    static async insertMany(dbs, taggableFiles, inLocalTaggableServiceTagID) {
        if (taggableFiles.length === 0) {
            return [];
        }

        dbs = await dbBeginTransaction(dbs);

        const insertedTaggables = await Taggables.insertMany(dbs, taggableFiles.map(taggableFile => taggableFile.Taggable_Name));

        const taggableFileInsertionParams = [];
        for (let i = 0; i < taggableFiles.length; ++i) {
            taggableFileInsertionParams.push(taggableFiles[i].File_ID);
            taggableFileInsertionParams.push(Number(insertedTaggables[i].Taggable_ID));
        }

        /** @type {DBTaggableFile[]} */
        const insertedDBTaggableFiles = await dball(dbs, `
            INSERT INTO Taggable_Files(
                File_ID,
                Taggable_ID
            ) VALUES ${dbtuples(taggableFiles.length, 2)} RETURNING *;
            `, taggableFileInsertionParams
        );
        const mappedInsertedDBTaggableFiles = insertedDBTaggableFiles.map((dbTaggableFile, i) => mapDBTaggableFile(dbTaggableFile, taggableFiles[i]));

        await dbs.perfTags.insertTagPairings(new Map([
            [inLocalTaggableServiceTagID, mappedInsertedDBTaggableFiles.map(taggableFile => taggableFile.Taggable_ID)],
            [IS_FILE_TAG.Tag_ID, mappedInsertedDBTaggableFiles.map(taggableFile => taggableFile.Taggable_ID)],
            [HAS_TRANSPARENCY_TAG.Tag_ID, mappedInsertedDBTaggableFiles.filter(taggableFile => taggableFile.Has_Transparency !== 0).map(taggableFile => taggableFile.Taggable_ID)],
            [HAS_METADATA_TAG.Tag_ID, mappedInsertedDBTaggableFiles.filter(taggableFile => taggableFile.Has_Metadata !== 0).map(taggableFile => taggableFile.Taggable_ID)],
            [HAS_ICC_PROFILE_TAG.Tag_ID, mappedInsertedDBTaggableFiles.filter(taggableFile => taggableFile.Has_ICC_Profile !== 0).map(taggableFile => taggableFile.Taggable_ID)],
            [HAS_EXIF_TAG.Tag_ID, mappedInsertedDBTaggableFiles.filter(taggableFile => taggableFile.Has_EXIF !== 0).map(taggableFile => taggableFile.Taggable_ID)],
            ...(await LocalTags.createTagPairingsFromTaggableToSystemTagLookupNameMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createFileExtensionLookupName(normalizeFileExtension(taggableFile.File_Extension))])))),
            ...(await LocalTags.createTagPairingsFromTaggableToSystemTagLookupNameMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createHasFileHashLookupName(taggableFile.File_Hash.toString("hex"))])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(FILE_SIZE_METRIC, taggableFile.File_Size)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(VIDEO_SIZE_METRIC, taggableFile.Video_Size)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(FRAME_COUNT_METRIC, taggableFile.Frame_Count)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(WIDTH_METRIC, taggableFile.Width)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(HEIGHT_METRIC, taggableFile.Height)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(DURATION_METRIC, taggableFile.Duration)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(AUDIO_SIZE_METRIC, taggableFile.Audio_Size)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(AUDIO_DIMENSIONS_METRIC, taggableFile.Audio_Dimensions)])))),
            ...(await AppliedMetrics.createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, new Map(mappedInsertedDBTaggableFiles.map(taggableFile => [taggableFile.Taggable_ID, createSystemAppliedMetric(AUDIO_SAMPLE_RATE_METRIC, taggableFile.Audio_Sample_Rate)])))),
        ]), dbs.inTransaction);

        await dbEndTransaction(dbs);

        return mappedInsertedDBTaggableFiles;
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertTaggableFile[]} preInsertTaggableFiles
     * @param {bigint} inLocalTaggableServiceTagID
     */
    static async uniqueInsertMany(dbs, preInsertTaggableFiles, inLocalTaggableServiceTagID) {
        if (preInsertTaggableFiles.length === 0) {
            return {
                dbTaggableFiles: [],
                finalizeFileMove: async () => {}
            };
        }
        // dedupe
        preInsertTaggableFiles = [...(new Map(preInsertTaggableFiles.map(taggableFile => [taggableFile.File_Hash.toString("hex"), taggableFile]))).values()];
        const {dbFiles, finalizeFileMove} = await Files.uniqueInsertMany(dbs, preInsertTaggableFiles);
        const dbFilesHashMap = new Map(dbFiles.map(dbFile => [dbFile.File_Hash.toString("hex"), dbFile]));
        const preparedTaggableFiles = preInsertTaggableFiles.map(preInsertTaggableFile => preparePreInsertTaggableFile(preInsertTaggableFile, dbFilesHashMap.get(preInsertTaggableFile.File_Hash.toString("hex"))));
        
        const dbTaggableFiles = await TaggableFiles.selectMany(dbs, preparedTaggableFiles, inLocalTaggableServiceTagID);
        const dbTaggableFilesExisting = new Set(dbTaggableFiles.map(dbTaggableFile => dbTaggableFile.File_Hash.toString("hex")));
        const preparedTaggableFilesToInsert = preparedTaggableFiles.filter(taggableFile => !dbTaggableFilesExisting.has(taggableFile.File_Hash.toString("hex")));
        const dbTaggableFilesInserted = await TaggableFiles.insertMany(dbs, preparedTaggableFilesToInsert, inLocalTaggableServiceTagID);

        return {
            dbTaggableFiles: dbTaggableFiles.concat(dbTaggableFilesInserted),
            finalizeFileMove
        };
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     */
    static async deleteManyByTaggableIDs(dbs, taggableIDs) {
        await dbrun(dbs, `DELETE FROM Taggable_Files WHERE Taggable_ID IN ${dbvariablelist(taggableIDs.length)}`, taggableIDs.map(Number));
    }
}