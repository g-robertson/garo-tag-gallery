
/** @import {DBService} from "./services.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */
/** @import {DBLocalTag} from "./tags.js" */
/** @import {ClientComparator} from "../api/zod-types.js" */

import { PERMISSIONS } from "../client/js/user.js";
import { dball, dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun, dbsqlcommand, dbtuples, dbvariablelist } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js"
import { Users } from "./user.js";
import { insertSystemTag, LocalTags } from "./tags.js";
import { Taggables } from "./taggables.js";
import PerfTags from "../perf-binding/perf-tags.js";
import { createAppliedMetricLookupName, createInLocalMetricServiceLookupName, createLocalMetricLookupName } from "../client/js/metrics.js";
import { mapNullCoalesce } from "../client/js/client-util.js";
import { Z_CLIENT_COMPARATOR } from "../api/zod-types.js";
import { SYSTEM_LOCAL_METRIC_SERVICE } from "../client/js/defaults.js";

/**
 * @param {TagMappedDBLocalMetric} systemMetric
 */
export function insertSystemMetric(systemMetric) {
    return [
        ...insertSystemTag(systemMetric.Has_Local_Metric_Tag),
        dbsqlcommand(`
            INSERT INTO Local_Metrics(
                Local_Metric_ID,
                Local_Metric_Service_ID,
                Local_Metric_Name,
                Local_Metric_Lower_Bound,
                Local_Metric_Upper_Bound,
                Local_Metric_Precision,
                Local_Metric_Type
            ) VALUES (
                $systemLocalMetricID,
                $systemLocalMetricServiceID,
                $systemLocalMetricName,
                $systemLocalMetricLowerBound,
                $systemLocalMetricUpperBound,
                $systemLocalMetricPrecision,
                $systemLocalMetricType 
            );
        `, {
            $systemLocalMetricID: systemMetric.Local_Metric_ID,
            $systemLocalMetricServiceID: SYSTEM_LOCAL_METRIC_SERVICE.Local_Metric_Service_ID,
            $systemLocalMetricName: systemMetric.Local_Metric_Name,
            $systemLocalMetricLowerBound: systemMetric.Local_Metric_Lower_Bound,
            $systemLocalMetricUpperBound: systemMetric.Local_Metric_Upper_Bound,
            $systemLocalMetricPrecision: systemMetric.Local_Metric_Precision,
            $systemLocalMetricType: systemMetric.Local_Metric_Type
        })
    ];
}

/**
 * @typedef {Object} DBLocalMetricService
 * @property {number} Local_Metric_Service_ID
 * @property {number} Service_ID
 * @property {DBLocalMetric[]} Local_Metrics
 */

/**
 * @typedef {DBLocalMetricService & DBService & {
 *     Has_Metric_From_Local_Metric_Service_Tag: DBLocalTag
 * }} DBJoinedLocalMetricService
 */
/** @typedef {DBJoinedLocalMetricService & {Permission: Set<string>}} DBPermissionedLocalMetricService */

/**
 * @param {Databases} dbs
 * @param {Omit<DBJoinedLocalMetricService, "Local_Metrics" | "Has_Metric_From_Local_Metric_Service_Tag_ID">[]} localMetricServices
 */
async function mapLocalMetricServices(dbs, localMetricServices) {
    const localMetrics = await LocalMetrics.selectManyByLocalMetricServiceIDs(dbs, localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID));
    const tagMappings = await LocalMetricServices.selectTagMappings(dbs, localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID));
    /** @type {Map<number, DBLocalMetric[]>} */
    const localMetricServiceToLocalMetricsMap = new Map(localMetricServices.map(localMetricService => [localMetricService.Local_Metric_Service_ID, []]));
    for (const localMetric of localMetrics) {
        localMetricServiceToLocalMetricsMap.get(localMetric.Local_Metric_Service_ID).push(localMetric);
    }

    return localMetricServices.map((localMetricService, i) => ({
        ...localMetricService,
        Has_Metric_From_Local_Metric_Service_Tag: tagMappings[i],
        Local_Metrics: localMetricServiceToLocalMetricsMap.get(localMetricService.Local_Metric_Service_ID)
    }));
}

export class LocalMetricServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricServiceIDs 
     */
    static async selectTagMappings(dbs, localMetricServiceIDs) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, localMetricServiceIDs.map(createInLocalMetricServiceLookupName));
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localMetricServiceID 
     */
    static async selectTagMapping(dbs, localMetricServiceID) {
        return (await LocalMetricServices.selectTagMappings(dbs, [localMetricServiceID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs
     */
    static async selectManyByLocalMetricIDs(dbs, localMetricIDs) {
        return await mapLocalMetricServices(dbs, await dballselect(dbs, `
            SELECT DISTINCT LMS.*, S.*
              FROM Local_Metric_Services LMS
              JOIN Services S ON LMS.Service_ID = S.Service_ID
              JOIN Local_Metrics LM ON LMS.Local_Metric_Service_ID = LM.Local_Metric_Service_ID
              WHERE Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)}
            `, localMetricIDs
        ));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} localMetricID
     */
    static async selectByLocalMetricID(dbs, localMetricID) {
        return (await LocalMetricServices.selectManyByLocalMetricIDs(dbs, [localMetricID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricServiceIDs
     */
    static async selectManyByIDs(dbs, localMetricServiceIDs) {
        return await mapLocalMetricServices(dbs, await dballselect(dbs, `
            SELECT *
              FROM Local_Metric_Services LMS
              JOIN Services S ON LMS.Service_ID = S.Service_ID
              WHERE LMS.Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)};`,
            ...localMetricServiceIDs
        ));
    }
    /**
     * @param {Databases} dbs 
     * @param {number} localMetricServiceID
     */
    static async selectByID(dbs, localMetricServiceID) {
        return (await LocalMetricServices.selectManyByIDs(dbs, [localMetricServiceID]))[0];
    }

    static async selectAll(dbs) {
        return await mapLocalMetricServices(dbs, await dballselect(dbs, `
            SELECT *
              FROM Local_Metric_Services LMS
              JOIN Services S ON LMS.Service_ID = S.Service_ID;
        `));
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {string[]} permissionsToCheck
     * @param {number[]} localMetricServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionsToCheck, localMetricServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionsToCheck)) {
            return await LocalMetricServices.selectManyByIDs(dbs, localMetricServiceIDs);
        }

        return await mapLocalMetricServices(dbs, await dballselect(dbs, `
            SELECT LMS.*, S.*
            FROM Local_Metric_Services LMS
            JOIN Services_Users_Permissions SUP ON LMS.Service_ID = SUP.Service_ID
            JOIN Services S ON LMS.Service_ID = S.Service_ID
            WHERE (
                SELECT COUNT(1)
                FROM Services_Users_Permissions SUP
                WHERE LMS.Service_ID = SUP.Service_ID
                AND SUP.User_ID = ?
                AND SUP.Permission IN ${dbvariablelist(permissionsToCheck.length)}
            ) = ?
            AND LMS.Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)}
        `, [
            user.id(),
            ...permissionsToCheck,
            permissionsToCheck.length,
            ...localMetricServiceIDs
        ]));
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]} permissionsToCheck 
     * @param {number} localMetricServiceID
     */
    static async userSelectByID(dbs, user, permissionsToCheck, localMetricServiceID) {
        return (await LocalMetricServices.userSelectManyByIDs(dbs, user, permissionsToCheck, [localMetricServiceID]))[0];
    }

    /**
     * @param {Databases} dbs
     * @param {User} user 
     * @param {=} permissionsToCheck
     */
    static async userSelectAll(dbs, user, permissionsToCheck) {
        return await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            LocalMetricServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT LMS.Local_Metric_Service_ID, SUP.Permission
                      FROM Local_Metric_Services LMS
                      JOIN Services_Users_Permissions SUP ON LMS.Service_ID = SUP.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()});
            },
            "Local_Metric_Service_ID",
            permissionsToCheck
        );
    }

    /**
     * @param {Databases} dbs
     * @param {number} user
     * @param {string} serviceName
     */
    static async userInsert(dbs, userID, serviceName) {
        dbs = await dbBeginTransaction(dbs);

        const serviceID = await Services.insert(dbs, serviceName);
        await ServicesUsersPermissions.insertMany(dbs, serviceID, userID, Object.values(PERMISSIONS.LOCAL_METRIC_SERVICES).map(permission => permission.name));

        /** @type {number} */
        const localMetricServiceID = (await dbget(dbs, `
            INSERT INTO Local_Metric_Services(
                Service_ID,
                User_Editable
            ) VALUES (
                $serviceID,
                1 
            ) RETURNING Local_Metric_Service_ID;
        `, {
            $serviceID: serviceID
        })).Local_Metric_Service_ID;
        
        await LocalTags.insertSystemTag(dbs, createInLocalMetricServiceLookupName(localMetricServiceID));

        await dbEndTransaction(dbs);

        return localMetricServiceID;
    }

    /**
     * @param {Databases} dbs
     * @param {number} localMetricServiceID
     * @param {string} serviceName
     */
    static async update(dbs, localMetricServiceID, serviceName) {
        const localMetricService = await LocalMetricServices.selectByID(dbs, localMetricServiceID);
        await Services.update(dbs, localMetricService.Service_ID, serviceName);

        return localMetricServiceID;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localMetricServiceID 
     */
    static async deleteByID(dbs, localMetricServiceID) {
        dbs = await dbBeginTransaction(dbs);

        const localMetricService = await LocalMetricServices.selectByID(dbs, localMetricServiceID);

        await Services.deleteByID(dbs, localMetricService.Service_ID);
        await LocalMetrics.deleteManyByIDs(dbs, localMetricService.Local_Metrics.map(localMetric => localMetric.Local_Metric_ID));
        await LocalTags.deleteSystemTag(dbs, createInLocalMetricServiceLookupName(localMetricServiceID));
        await dbrun(dbs, "DELETE FROM Local_Metric_Services WHERE Local_Metric_Service_ID = $localMetricServiceID;", { $localMetricServiceID: localMetricServiceID });

        await dbEndTransaction(dbs);
    }
}

/**
 * @typedef {Object} PreInsertAppliedMetric
 * @property {number} Local_Metric_ID
 * @property {number=} User_ID
 * @property {number} Applied_Value
 * 
 * @typedef {PreInsertAppliedMetric & {Local_Applied_Metric_PK_Hash: string}} PreparedPreInsertAppliedMetric
 * @typedef {PreparedPreInsertAppliedMetric & { Local_Applied_Metric_ID: number }} DBAppliedMetric
 * @typedef {DBAppliedMetric & {Local_Applied_Metric_Tag: DBLocalTag}} TagMappedDBAppliedMetric
 **/

/**
 * @param {PreInsertAppliedMetric} preInsertAppliedMetric
 */
export function appliedMetricsPKHash(preInsertAppliedMetric) {
    return `${preInsertAppliedMetric.Local_Metric_ID}\x01${preInsertAppliedMetric.User_ID ?? "SYS"}\x01${preInsertAppliedMetric.Applied_Value}`;
}

/**
 * @param {PreInsertAppliedMetric[]} preInsertAppliedMetrics 
 */
async function preparePreInsertAppliedMetrics(dbs, preInsertAppliedMetrics) {
    const localMetrics = await LocalMetrics.selectManyByIDs(dbs, preInsertAppliedMetrics.map(preInsertAppliedMetric => preInsertAppliedMetric.Local_Metric_ID));
    const localMetricsMap = new Map(localMetrics.map(localMetric => [localMetric.Local_Metric_ID, localMetric]));
    const userMap = new Map((await Users.selectManyByIDs(dbs, preInsertAppliedMetrics.map(preInsertAppliedMetric => preInsertAppliedMetric.User_ID))).map(user => [user.User_ID, {
        User_ID: user.User_ID,
        User_Name: user.User_Name    
    }]));

    return preInsertAppliedMetrics.map(preInsertAppliedMetric => ({
        ...preInsertAppliedMetric,
        ...localMetricsMap.get(preInsertAppliedMetric.Local_Metric_ID),
        ...userMap.get(preInsertAppliedMetric.User_ID),
        Local_Applied_Metric_PK_Hash: appliedMetricsPKHash(preInsertAppliedMetric)
    }));
}

export class AppliedMetrics {
    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, PreInsertAppliedMetric>} taggableToAppliedSystemMetricMap 
     */
    static async createTagPairingsFromTaggableToAppliedSystemMetricMap(dbs, taggableToAppliedSystemMetricMap) {
        for (const [taggableID, appliedMetric] of taggableToAppliedSystemMetricMap) {
            if (appliedMetric.Applied_Value === null) {
                taggableToAppliedSystemMetricMap.delete(taggableID);
            }
        }

        const appliedMetricsMap = new Map((await AppliedMetrics.tagMapped(dbs, await AppliedMetrics.uniqueInsertMany(dbs, [...taggableToAppliedSystemMetricMap.values()]))).map(appliedMetric => [
            appliedMetric.Local_Applied_Metric_PK_Hash,
            appliedMetric
        ]));

        /** @type {Map<bigint, bigint[]>} */
        const tagPairings = new Map();
        for (const [taggableID, appliedSystemMetric] of taggableToAppliedSystemMetricMap) {
            mapNullCoalesce(tagPairings, appliedMetricsMap.get(appliedMetricsPKHash(appliedSystemMetric)).Local_Applied_Metric_Tag.Tag_ID, []).push(taggableID);
        }
        return tagPairings;
    }
                
    /**
     * @param {Databases} dbs 
     * @param {PreInsertAppliedMetric[]} preInsertAppliedMetrics 
     */
    static async selectTagMappings(dbs, preInsertAppliedMetrics) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, preInsertAppliedMetrics.map(createAppliedMetricLookupName));
    }
    /**
     * @param {Databases} dbs 
     * @param {DBAppliedMetric[]} appliedMetrics 
     */
    static async tagMapped(dbs, appliedMetrics) {
        const localAppliedMetricTags = await AppliedMetrics.selectTagMappings(dbs, appliedMetrics);
        if (localAppliedMetricTags.length !== appliedMetrics.length) {
            throw "Differing tags to applied metrics";
        }

        return appliedMetrics.map((appliedMetric, i) => ({
            ...appliedMetric,
            Local_Applied_Metric_Tag: localAppliedMetricTags[i]
        }));
    }

    /**
     * @param {Databases} dbs 
     * @param {DBAppliedMetric} appliedMetric 
     */
    static async tagMap(dbs, appliedMetric) {
        return (await AppliedMetrics.tagMapped(dbs, [appliedMetric]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number} userID 
     * @param {number[]} localMetricIDs 
     */
    static async userSelectManyByLocalMetricIDs(dbs, userID, localMetricIDs) {
        /** @type {DBAppliedMetric[]} */
        const dbAppliedMetrics = await dballselect(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE User_ID = ? AND Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)};`,
            [userID, ...localMetricIDs]
        );
        return dbAppliedMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} userID 
     * @param {number} localMetricID 
     */
    static async userSelectManyByLocalMetricID(dbs, userID, localMetricID) {
        return await AppliedMetrics.userSelectManyByLocalMetricIDs(dbs, userID, [localMetricID]);
    }
    
    /**
     * 
     * @param {Databases} dbs 
     * @param {number} userID 
     * @param {number} localMetricID 
     * @param {bigint[]} taggableIDs 
     */
    static async userSelectMappedByTaggableIDsByLocalMetricID(dbs, userID, localMetricID, taggableIDs) {
        const appliedMetrics = await AppliedMetrics.tagMapped(dbs, await dballselect(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE (User_ID = ? OR (User_ID IS NULL AND ? IS NULL)) AND Local_Metric_ID = ?`,
            [userID, userID, localMetricID]
        ));
        const appliedMetricsTagMap = new Map(appliedMetrics.map(appliedMetric => [appliedMetric.Local_Applied_Metric_Tag.Tag_ID, appliedMetric]));
        const {taggablePairings} = await dbs.perfTags.readTaggablesSpecifiedTags(taggableIDs, [...appliedMetricsTagMap.keys()], dbs.inTransaction);
        return new Map([...taggablePairings].map(([taggableID, [tag]]) => [taggableID, appliedMetricsTagMap.get(tag)]));
    }

    /**
     * @param {Databases} dbs 
     * @param {number} userID
     * @param {number} localMetricID
     * @param {ClientComparator} comparator
     * @param {number} metricComparisonValue
     */
    static async userSelectManyByComparison(dbs, userID, localMetricID, comparator, metricComparisonValue) {
        const safeComparator = Z_CLIENT_COMPARATOR.safeParse(comparator);
        if (!safeComparator.success) {
            throw `Unsafe comparator value "${comparator}" managed its way into userSelectManyByComparisons`;
        }

        /** @type {DBAppliedMetric[]} */
        const dbAppliedMetrics = await dballselect(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE User_ID = ? AND Local_Metric_ID = ? AND Applied_Value ${safeComparator.data} ?;`,
            [userID, localMetricID, metricComparisonValue]
        );
        return dbAppliedMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs 
     */
    static async selectManyByLocalMetricIDs(dbs, localMetricIDs) {
        /** @type {DBAppliedMetric[]} */
        const dbAppliedMetrics = await dballselect(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)};`,
            localMetricIDs
        );
        return dbAppliedMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertAppliedMetric[]} appliedMetrics
     * @returns {Promise<DBAppliedMetric[]>}
     */
    static async selectMany(dbs, appliedMetrics) {
        if (appliedMetrics.length === 0) {
            return [];
        }

        if (appliedMetrics.length > 10000) {
            const slices = await asyncDataSlicer(appliedMetrics, 10000, (sliced) => AppliedMetrics.selectMany(dbs, sliced));
            return slices.flat();
        }

        /** @type {DBAppliedMetric[]} */
        const dbAppliedMetrics = await dballselect(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE Local_Applied_Metric_PK_Hash IN ${dbvariablelist(appliedMetrics.length)};`,
            appliedMetrics.map(appliedMetrics => appliedMetrics.Local_Applied_Metric_PK_Hash)
        );
        return dbAppliedMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertAppliedMetric[]} appliedMetrics 
     */
    static async insertMany(dbs, appliedMetrics) {
        if (appliedMetrics.length === 0) {
            return [];
        }

        dbs = await dbBeginTransaction(dbs);

        await LocalTags.insertManySystemTags(dbs, appliedMetrics.map(createAppliedMetricLookupName));

        const appliedMetricsInsertionParams = [];
        for (let i = 0; i < appliedMetrics.length; ++i) {
            const appliedMetric = appliedMetrics[i];
            appliedMetricsInsertionParams.push(appliedMetric.Local_Metric_ID);
            appliedMetricsInsertionParams.push(appliedMetric.Local_Applied_Metric_PK_Hash);
            appliedMetricsInsertionParams.push(appliedMetric.User_ID);
            appliedMetricsInsertionParams.push(appliedMetric.Applied_Value);
        }

        /** @type {DBAppliedMetric[]} */
        const insertedDBAppliedMetrics = await dball(dbs, `
            INSERT INTO Local_Applied_Metrics(
                Local_Metric_ID,
                Local_Applied_Metric_PK_Hash,
                User_ID,
                Applied_Value
            ) VALUES ${dbtuples(appliedMetrics.length, 4)} RETURNING *;
            `, appliedMetricsInsertionParams
        );

        await dbEndTransaction(dbs);

        return insertedDBAppliedMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertAppliedMetric[]} preInsertAppliedMetrics 
     */
    static async uniqueInsertMany(dbs, preInsertAppliedMetrics) {
        let preparedAppliedMetrics = await preparePreInsertAppliedMetrics(dbs, preInsertAppliedMetrics);

        // dedupe
        preparedAppliedMetrics = [...(new Map(preparedAppliedMetrics.map(preparedAppliedMetric => [preparedAppliedMetric.Local_Applied_Metric_PK_Hash, preparedAppliedMetric]))).values()];

        const dbAppliedMetrics = await AppliedMetrics.selectMany(dbs, preparedAppliedMetrics);
        const dbAppliedMetricsExisting = new Set(dbAppliedMetrics.map(dbAppliedMetric => dbAppliedMetric.Local_Applied_Metric_PK_Hash));
        const AppliedMetricsToInsert = preparedAppliedMetrics.filter(preparedAppliedMetric => !dbAppliedMetricsExisting.has(preparedAppliedMetric.Local_Applied_Metric_PK_Hash));
        const insertedDBAppliedMetrics = await AppliedMetrics.insertMany(dbs, AppliedMetricsToInsert);
        return dbAppliedMetrics.concat(insertedDBAppliedMetrics);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertAppliedMetric} preInsertAppliedMetric 
     */
    static async uniqueInsert(dbs, preInsertAppliedMetric) {
        return (await AppliedMetrics.uniqueInsertMany(dbs, [preInsertAppliedMetric]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {DBLocalTag} localTag 
     * @param {PreInsertAppliedMetric} preInsertAppliedMetric
     * @param {boolean} deleteExistingTag 
     * @param {User} user
     */
    static async userConvertFromLocalTag(dbs, localTag, preInsertAppliedMetric, deleteExistingTag, user) {
        dbs = await dbBeginTransaction(dbs);

        const appliedMetric = await AppliedMetrics.tagMap(dbs, await AppliedMetrics.uniqueInsert(dbs, preInsertAppliedMetric));

        const taggables = await Taggables.searchWithUser(dbs, PerfTags.searchTag(localTag.Tag_ID), user);
        await AppliedMetrics.applyToTaggables(dbs, taggables.map(taggable => taggable.Taggable_ID), appliedMetric);

        if (deleteExistingTag) {
            await LocalTags.delete(dbs, localTag);
        }

        await dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, TagMappedDBAppliedMetric[]>} taggableMetricPairings 
     */
    static async applyManyMappedToTaggables(dbs, taggableMetricPairings) {
        if (taggableMetricPairings.size === 0) {
            return;
        }

        dbs = await dbBeginTransaction(dbs);
        /** @type {Set<number>} */
        const allLocalMetricIDs = new Set();
        /** @type {Map<number, Set<number>>} */
        const userIDToLocalMetricIDs = new Map();
        for (const appliedMetrics of taggableMetricPairings.values()) {
            for (const appliedMetric of appliedMetrics) {
                allLocalMetricIDs.add(appliedMetric.Local_Metric_ID);
                const userLocalMetricIDs = mapNullCoalesce(userIDToLocalMetricIDs, appliedMetric.User_ID, new Set());
                userLocalMetricIDs.add(appliedMetric.Local_Metric_ID);
            }
        }
        /** @type {Map<number, Map<number, bigint[]>>} */
        const userIDToOtherAppliedMetricsMap = new Map([...allLocalMetricIDs].map(localMetricID => [localMetricID, []]));
        for (const [userID, localMetricIDs] of userIDToLocalMetricIDs) {
            /** @type {Map<number, bigint[]>} */
            const otherAppliedMetricsMap = new Map([...localMetricIDs].map(localMetricID => [localMetricID, []]));
            for (const appliedMetric of await AppliedMetrics.tagMapped(dbs, await AppliedMetrics.userSelectManyByLocalMetricIDs(dbs, userID, [...localMetricIDs]))) {
                otherAppliedMetricsMap.get(appliedMetric.Local_Metric_ID).push(appliedMetric.Local_Applied_Metric_Tag.Tag_ID);
            }
            userIDToOtherAppliedMetricsMap.set(userID, otherAppliedMetricsMap);
        }

        const localMetricMap = new Map((await LocalMetrics.tagMapped(dbs, await LocalMetrics.selectManyByIDs(dbs, [...allLocalMetricIDs]))).map(localMetric => [
            localMetric.Local_Metric_ID,
            localMetric
        ]));
        const localMetricServiceMap = new Map((await LocalMetricServices.selectManyByLocalMetricIDs(dbs, [...allLocalMetricIDs])).map(localMetricService => [
            localMetricService.Local_Metric_Service_ID,
            localMetricService
        ]))

        // remove pre-existing metric applications of the same type
        /** @type {Map<bigint, bigint[]>} */
        const taggableMetricPairingsToRemove = new Map();
        /** @type {Map<bigint, bigint[]>} */
        const taggableMetricPairingsToInsert = new Map();

        for (const [taggableID, appliedMetrics] of taggableMetricPairings) {
            /** @type {bigint[]} */
            const metricTagIDsToRemove = [];
            /** @type {bigint[]} */
            const metricTagIDsToInsert = [];
            for (const appliedMetric of appliedMetrics) {
                metricTagIDsToRemove.push(...userIDToOtherAppliedMetricsMap.get(appliedMetric.User_ID).get(appliedMetric.Local_Metric_ID));

                metricTagIDsToInsert.push(appliedMetric.Local_Applied_Metric_Tag.Tag_ID);
                metricTagIDsToInsert.push(localMetricMap.get(appliedMetric.Local_Metric_ID).Has_Local_Metric_Tag.Tag_ID);
                metricTagIDsToInsert.push(localMetricServiceMap.get(localMetricMap.get(appliedMetric.Local_Metric_ID).Local_Metric_Service_ID).Has_Metric_From_Local_Metric_Service_Tag.Tag_ID);
            }
            taggableMetricPairingsToRemove.set(taggableID, metricTagIDsToRemove);
            taggableMetricPairingsToInsert.set(taggableID, metricTagIDsToInsert);
        }
        await dbs.perfTags.deleteTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggableMetricPairingsToRemove), dbs.inTransaction);
        await dbs.perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggableMetricPairingsToInsert), dbs.inTransaction);
        await dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {TagMappedDBAppliedMetric} appliedMetric 
     */
    static async applyToTaggables(dbs, taggableIDs, appliedMetric) {
        await AppliedMetrics.applyManyMappedToTaggables(dbs, new Map(taggableIDs.map(taggableID => [taggableID, [appliedMetric]])));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {bigint} taggableID
     * @param {TagMappedDBAppliedMetric} appliedMetric 
     */
    static async applyToTaggable(dbs, taggableID, appliedMetric) {
        await AppliedMetrics.applyToTaggables(dbs, [taggableID], appliedMetric);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs 
     */
    static async deleteManyByLocalMetricIDs(dbs, localMetricIDs) {
        dbs = await dbBeginTransaction(dbs);

        const appliedMetrics = await AppliedMetrics.selectManyByLocalMetricIDs(dbs, localMetricIDs);
        await LocalTags.deleteManySystemTags(dbs, appliedMetrics.map(createAppliedMetricLookupName));
        await dbrun(dbs, `DELETE FROM Local_Applied_Metrics WHERE Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)}`, localMetricIDs);

        await dbEndTransaction(dbs);
    }
};

/**
 * @typedef {Object} PreInsertLocalMetric
 * @property {string} Local_Metric_Name
 * @property {number} Local_Metric_Lower_Bound
 * @property {number} Local_Metric_Upper_Bound
 * @property {number} Local_Metric_Precision
 * @property {number} Local_Metric_Type
 * 
 * @typedef {PreInsertLocalMetric & { Local_Metric_ID: number, Local_Metric_Service_ID: number }} DBLocalMetric
 */

/**
 * @typedef {DBLocalMetric & {
 *     Has_Local_Metric_Tag: DBLocalTag
 * }} TagMappedDBLocalMetric
 */

export class LocalMetrics {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs 
     */
    static async selectTagMappings(dbs, localMetricIDs) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, localMetricIDs.map(createLocalMetricLookupName));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} localMetricID
     */
    static async selectTagMapping(dbs, localMetricID) {
        return (await LocalMetrics.selectTagMappings(dbs, [localMetricID]))[0]
    }

    /**
     * @param {Databases} dbs 
     * @param {DBLocalMetric[]} localMetrics 
     */
    static async tagMapped(dbs, localMetrics) {
        const tagMappings = await LocalMetrics.selectTagMappings(dbs, localMetrics.map(localMetric => localMetric.Local_Metric_ID));
        return localMetrics.map((localMetric, i) => ({
            ...localMetric,
            Has_Local_Metric_Tag: tagMappings[i]
        }));
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs 
     */
    static async selectManyByIDs(dbs, localMetricIDs) {
        /** @type {DBLocalMetric[]} */
        const dbLocalMetrics = await dballselect(dbs, `
            SELECT *
              FROM Local_Metrics
             WHERE Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)}
            ;`, localMetricIDs
        );

        return dbLocalMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localMetricID 
     */
    static async selectByID(dbs, localMetricID) {
        return (await LocalMetrics.selectManyByIDs(dbs, [localMetricID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricServiceIDs
     */
    static async selectManyByLocalMetricServiceIDs(dbs, localMetricServiceIDs) {
        /** @type {DBLocalMetric[]} */
        const dbLocalMetrics = await dballselect(dbs, `
            SELECT *
              FROM Local_Metrics
             WHERE Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)}
            ;`, localMetricServiceIDs
        );

        return dbLocalMetrics;
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertLocalMetric} preInsertLocalMetric
     * @param {number} localMetricServiceID
     */
    static async insert(dbs, preInsertLocalMetric, localMetricServiceID) {
        dbs = await dbBeginTransaction(dbs);

        if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Lower_Bound)) {
            preInsertLocalMetric.Local_Metric_Lower_Bound = null;
        }
        if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Upper_Bound)) {
            preInsertLocalMetric.Local_Metric_Upper_Bound = null;
        }


        const localMetricID = (await dbget(dbs, `
            INSERT INTO Local_Metrics(
                Local_Metric_Service_ID,
                Local_Metric_Name,
                Local_Metric_Lower_Bound,
                Local_Metric_Upper_Bound,
                Local_Metric_Precision,
                Local_Metric_Type
            ) VALUES (
                $localMetricServiceID,
                $localMetricName,
                $localMetricLowerBound,
                $localMetricUpperBound,
                $localMetricPrecision,
                $localMetricType
            ) RETURNING Local_Metric_ID;
        `, {
            $localMetricServiceID: localMetricServiceID,
            $localMetricName: preInsertLocalMetric.Local_Metric_Name,
            $localMetricLowerBound: preInsertLocalMetric.Local_Metric_Lower_Bound,
            $localMetricUpperBound: preInsertLocalMetric.Local_Metric_Upper_Bound,
            $localMetricPrecision: preInsertLocalMetric.Local_Metric_Precision,
            $localMetricType: preInsertLocalMetric.Local_Metric_Type
        })).Local_Metric_ID;

        await LocalTags.insertSystemTag(dbs, createLocalMetricLookupName(localMetricID));

        await dbEndTransaction(dbs);

        return localMetricID;
    }

    
    /**
     * @param {Databases} dbs
     * @param {number} localMetricID
     * @param {PreInsertLocalMetric} preInsertLocalMetric
     */
    static async update(dbs, localMetricID, preInsertLocalMetric) {
        if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Lower_Bound)) {
            preInsertLocalMetric.Local_Metric_Lower_Bound = null;
        }
        if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Upper_Bound)) {
            preInsertLocalMetric.Local_Metric_Upper_Bound = null;
        }

        await dbrun(dbs, `
            UPDATE Local_Metrics
               SET Local_Metric_Name = $localMetricName,
                   Local_Metric_Lower_Bound = $localMetricLowerBound,
                   Local_Metric_Upper_Bound = $localMetricUpperBound,
                   Local_Metric_Precision = $localMetricPrecision,
                   Local_Metric_Type = $localMetricType
             WHERE Local_Metric_ID = $localMetricID;
        `, {
            $localMetricID: localMetricID,
            $localMetricName: preInsertLocalMetric.Local_Metric_Name,
            $localMetricLowerBound: preInsertLocalMetric.Local_Metric_Lower_Bound,
            $localMetricUpperBound: preInsertLocalMetric.Local_Metric_Upper_Bound,
            $localMetricPrecision: preInsertLocalMetric.Local_Metric_Precision,
            $localMetricType: preInsertLocalMetric.Local_Metric_Type
        });
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs 
     */
    static async deleteManyByIDs(dbs, localMetricIDs) {
        if (localMetricIDs.length === 0) {
            return;
        }

        dbs = await dbBeginTransaction(dbs);

        await AppliedMetrics.deleteManyByLocalMetricIDs(dbs, localMetricIDs);
        await LocalTags.deleteManySystemTags(dbs, localMetricIDs.map(createLocalMetricLookupName));
        await dbrun(dbs, `DELETE FROM Local_Metrics WHERE Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)}`, localMetricIDs);

        await dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localMetricID  
     */
    static async deleteByID(dbs, localMetricID) {
        return await LocalMetrics.deleteManyByIDs(dbs, [localMetricID]);
    }
};