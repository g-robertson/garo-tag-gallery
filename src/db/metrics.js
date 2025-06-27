
/** @import {DBService} from "./services.js" */
/** @import {PermissionInt} from "./user.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */
/** @import {DBLocalTag} from "./tags.js" */

import { PERMISSION_BITS, PERMISSIONS } from "../client/js/user.js";
import { dball, dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbtuples, dbvariablelist } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js"
import { Users } from "./user.js";
import { LocalTags } from "./tags.js";
import { Taggables } from "./taggables.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";
import { createAppliedMetricLookupName, createInLocalMetricServiceLookupName, createLocalMetricLookupName } from "../client/js/metrics.js";

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
/** @typedef {DBJoinedLocalMetricService & {Permission_Extent: PermissionInt}} DBPermissionedLocalMetricService */

/**
 * @param {Databases} dbs
 * @param {Omit<DBJoinedLocalMetricService, "Local_Metrics" | "Has_Metric_From_Local_Metric_Service_Tag_ID">[]} localMetricServices
 */
async function mapLocalMetricServices(dbs, localMetricServices) {
    const localMetrics = await LocalMetrics.selectManyByLocalMetricServiceIDs(dbs, localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID));
    const tagMappings = await LocalMetricServices.selectTagMappings(dbs, localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID));
    /** @type {Map<number, DBLocalMetric[]>} */
    const localMetricsMap = new Map(localMetricServices.map(localMetricService => [localMetricService.Local_Metric_Service_ID, []]));
    for (const localMetric of localMetrics) {
        localMetricsMap.get(localMetric.Local_Metric_Service_ID).push(localMetric);
    }

    return localMetricServices.map((localMetricService, i) => ({
        ...localMetricService,
        Has_Metric_From_Local_Metric_Service_Tag: tagMappings[i],
        Local_Metrics: localMetricsMap.get(localMetricService.Local_Metric_Service_ID)
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
              WHERE LMS.Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)};`, localMetricServiceIDs
        ));
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
     * @param {PermissionInt} permissionBitsToCheck
     * @param {number[]} localMetricServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionBitsToCheck, localMetricServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionBitsToCheck, PERMISSIONS.LOCAL_METRIC_SERVICES)) {
            return await LocalMetricServices.selectManyByIDs(dbs, localMetricServiceIDs);
        }

        return await mapLocalMetricServices(dbs, await dballselect(dbs, `
            SELECT LMS.*, S.*
              FROM Local_Metric_Services LMS
              JOIN Services_Users_Permissions SUP ON LMS.Service_ID = SUP.Service_ID
              JOIN Services S ON LMS.Service_ID = S.Service_ID
             WHERE SUP.User_ID = ?
               AND (SUP.Permission_Extent & ?) = ?
               AND LMS.Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)};
        `, [
            user.id(),
            permissionBitsToCheck,
            permissionBitsToCheck,
            ...localMetricServiceIDs
        ]));
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {PermissionInt} permissionBitsToCheck 
     * @param {number} localMetricServiceID
     */
    static async userSelectByID(dbs, user, permissionBitsToCheck, localMetricServiceID) {
        return (await LocalMetricServices.userSelectManyByIDs(dbs, user, permissionBitsToCheck, [localMetricServiceID]))[0];
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
            PERMISSIONS.LOCAL_METRIC_SERVICES,
            LocalMetricServices.selectAll,
            async () => {
                return await mapLocalMetricServices(dbs, await dballselect(dbs, `
                    SELECT SUP.Permission_Extent, LMS.*, S.*
                      FROM Local_Metric_Services LMS
                      JOIN Services_Users_Permissions SUP ON LMS.Service_ID = SUP.Service_ID
                      JOIN Services S ON LMS.Service_ID = S.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()}));
            },
            "Local_Metric_Service_ID",
            permissionBitsToCheck
        );
    }

    /**
     * @param {Databases} dbs
     * @param {User} user
     * @param {string} serviceName
     */
    static async userInsert(dbs, user, serviceName) {
        dbs = await dbBeginTransaction(dbs);

        const serviceID = await Services.insert(dbs, serviceName);
        await ServicesUsersPermissions.insert(dbs, serviceID, user.id(), PERMISSION_BITS.ALL);

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
        
        await LocalTags.insertSystemTag(createInLocalMetricServiceLookupName(localMetricServiceID));

        await dbEndTransaction(dbs);
    }
}

/**
 * @typedef {Object} DBAppliedMetric
 * @property {number} Local_Applied_Metric_ID
 * @property {number} Local_Metric_ID
 * @property {number} User_ID
 * @property {number} Applied_Value
 * @property {string} Local_Applied_Metric_PK_Hash
 */

/**
 * @typedef {{
 *     Local_Applied_Metric_Tag: DBLocalTag
 * } & DBAppliedMetric} TagMappedDBAppliedMetric
 */

/**
 * @typedef {Object} PreInsertAppliedMetric
 * @property {number} Local_Metric_ID
 * @property {number} User_ID
 * @property {number} Applied_Value
 */

/**
 * @typedef {PreInsertAppliedMetric & DBLocalMetric & {User_Name: string, Local_Applied_Metric_PK_Hash: string}} PreparedPreInsertAppliedMetric
 */

/**
 * @param {PreInsertAppliedMetric} preInsertAppliedMetric
 */
export function appliedMetricsPKHash(preInsertAppliedMetric) {
    return `${preInsertAppliedMetric.Local_Metric_ID}\x01${preInsertAppliedMetric.User_ID}\x01${preInsertAppliedMetric.Applied_Value}`;
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
     * @param {PreInsertAppliedMetric[]} preInsertAppliedMetrics
     * @returns {Promise<DBAppliedMetric[]}
     */
    static async selectManyByPreInsertAppliedMetrics(dbs, preInsertAppliedMetrics) {
        if (preInsertAppliedMetrics.length === 0) {
            return [];
        }
        if (preInsertAppliedMetrics.length > 10000) {
            const slices = await asyncDataSlicer(preInsertAppliedMetrics, 10000, (sliced) => AppliedMetrics.selectManyByPreInsertAppliedMetrics(dbs, sliced));
            return slices.flat();
        }

        /** @type {DBAppliedMetric[]} */
        const dbAppliedMetrics = await dballselect(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE Local_Applied_Metric_PK_Hash IN ${dbvariablelist(preInsertAppliedMetrics.length)};`,
            preInsertAppliedMetrics.map(appliedMetricsPKHash)
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

        await LocalTags.insertManySystemTags(dbs, appliedMetrics.map(appliedMetric => createAppliedMetricLookupName(appliedMetric)));

        const appliedMetricsInsertionParams = [];
        for (let i = 0; i < appliedMetrics.length; ++i) {
            const appliedMetric = appliedMetrics[i];
            appliedMetricsInsertionParams.push(appliedMetric.Local_Metric_ID);
            appliedMetricsInsertionParams.push(appliedMetric.User_ID);
            appliedMetricsInsertionParams.push(appliedMetric.Applied_Value);
            appliedMetricsInsertionParams.push(appliedMetric.Local_Applied_Metric_PK_Hash);
        }

        /** @type {DBAppliedMetric[]} */
        const insertedDBAppliedMetrics = await dball(dbs, `
            INSERT INTO Local_Applied_Metrics(
                Local_Metric_ID,
                User_ID,
                Applied_Value,
                Local_Applied_Metric_PK_Hash
            ) VALUES ${dbtuples(appliedMetrics.length, 4)} RETURNING *;
            `, appliedMetricsInsertionParams
        );

        dbs = await dbEndTransaction(dbs);

        return insertedDBAppliedMetrics;
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertAppliedMetric[]} preInsertAppliedMetrics 
     */
    static async upsertMany(dbs, preInsertAppliedMetrics) {
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
    static async upsert(dbs, preInsertAppliedMetric) {
        return (await AppliedMetrics.upsertMany(dbs, [preInsertAppliedMetric]))[0];
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

        const appliedMetric = await AppliedMetrics.tagMap(dbs, await AppliedMetrics.upsert(dbs, preInsertAppliedMetric));

        const taggables = await Taggables.searchWithUser(dbs, PerfTags.searchTag(localTag.Tag_ID), user);
        await AppliedMetrics.applyToTaggables(dbs, taggables.map(taggable => taggable.Taggable_ID), appliedMetric);

        if (deleteExistingTag) {
            await LocalTags.delete(dbs, localTag);
        }

        await dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {TagMappedDBAppliedMetric} appliedMetric 
     */
    static async applyToTaggables(dbs, taggableIDs, appliedMetric) {

        // remove pre-existing metric applications of the same type
        dbs = await dbBeginTransaction(dbs);
        const otherAppliedMetrics = await AppliedMetrics.tagMapped(
            dbs,
            await AppliedMetrics.userSelectManyByLocalMetricID(dbs, appliedMetric.User_ID, appliedMetric.Local_Metric_ID
        ));
        await dbs.perfTags.deleteTagPairings(new Map(otherAppliedMetrics.map(otherAppliedMetric => [otherAppliedMetric.Local_Applied_Metric_Tag.Tag_ID, taggableIDs])), dbs.inTransaction);

        const localHasMetricTag = await LocalMetrics.selectTagMapping(dbs, appliedMetric.Local_Metric_ID);
        const localMetricService = await LocalMetricServices.selectByLocalMetricID(dbs, appliedMetric.Local_Metric_ID);
        const localInMetricServiceTag = await LocalMetricServices.selectTagMapping(dbs, localMetricService.Local_Metric_Service_ID); 
        
        await dbs.perfTags.insertTagPairings(new Map([
            [appliedMetric.Local_Applied_Metric_Tag.Tag_ID, taggableIDs],
            [localHasMetricTag.Tag_ID, taggableIDs],
            [localInMetricServiceTag.Tag_ID, taggableIDs]
        ]), dbs.inTransaction);
        await dbEndTransaction(dbs);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {bigint} taggableID
     * @param {TagMappedDBAppliedMetric} appliedMetric 
     */
    static async applyToTaggable(dbs, taggableID, appliedMetric) {
        await AppliedMetrics.applyToTaggables(dbs, [taggableID], appliedMetric);
    }
};

/**
 * @typedef {Object} PreInsertLocalMetric
 * @property {string} Local_Metric_Name
 * @property {number} Local_Metric_Lower_Bound
 * @property {number} Local_Metric_Upper_Bound
 * @property {number} Local_Metric_Precision
 * @property {number} Local_Metric_Type
 */

/**
 * @typedef {Object} DBLocalMetric
 * @property {number} Local_Metric_ID
 * @property {number} Local_Metric_Service_ID
 * @property {string} Local_Metric_Name
 * @property {number} Local_Metric_Lower_Bound
 * @property {number} Local_Metric_Upper_Bound
 * @property {number} Local_Metric_Precision
 * @property {number} Local_Metric_Type
 */

/**
 * @typedef {{
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

        await LocalTags.insertSystemTag(createLocalMetricLookupName(localMetricID));

        await dbEndTransaction(dbs);
    }
};