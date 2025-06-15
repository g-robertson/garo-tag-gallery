
/** @import {DBService} from "./services.js" */
/** @import {DBUser, PermissionInt} from "./user.js" */
/** @import {DBLocalTag} from "./tags.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */

import { normalPreInsertLocalTag, SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../client/js/user.js";
import { dball, dbBeginTransaction, dbEndTransaction, dbrun, dbtuples, dbvariablelist } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js"
import { Users } from "./user.js";
import { LocalTags } from "./tags.js";
import { Taggables } from "./taggables.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";

/**
 * @typedef {Object} DBLocalMetricService
 * @property {number} Local_Metric_Service_ID
 * @property {number} Service_ID
 * @property {bigint} Has_Metric_From_Local_Metric_Service_Tag_ID
 * @property {DBLocalMetric[]} Local_Metrics
 */

/**
 * @typedef {DBLocalMetricService & DBService} DBJoinedLocalMetricService
 */
/** @typedef {DBJoinedLocalMetricService & {Permission_Extent: PermissionInt}} DBPermissionedLocalMetricService */

/**
 * @param {Databases} dbs
 * @param {Omit<DBJoinedLocalMetricService, "Local_Metrics">[]} localMetricServices
 */
async function mapLocalMetricServices(dbs, localMetricServices) {
    const localMetrics = await LocalMetrics.selectManyByLocalMetricServiceIDs(dbs, localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID));
    /** @type {Map<number, DBLocalMetric[]>} */
    const localMetricsMap = new Map(localMetricServices.map(localMetricService => [localMetricService.Local_Metric_Service_ID, []]));
    for (const localMetric of localMetrics) {
        localMetricsMap.get(localMetric.Local_Metric_Service_ID).push(localMetric);
    }

    return localMetricServices.map(localMetricService => ({
        ...localMetricService,
        Local_Metrics: localMetricsMap.get(localMetricService.Local_Metric_Service_ID),
        Has_Metric_From_Local_Metric_Service_Tag_ID: BigInt(localMetricService.Has_Metric_From_Local_Metric_Service_Tag_ID)
    }));
}

export class LocalMetricServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs
     */
    static async selectManyByLocalMetricIDs(dbs, localMetricIDs) {
        return await mapLocalMetricServices(dbs, await dball(dbs, `
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
        return await mapLocalMetricServices(dbs, await dball(dbs, `
            SELECT *
              FROM Local_Metric_Services LMS
              JOIN Services S ON LMS.Service_ID = S.Service_ID
              WHERE LMS.Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)};`, localMetricServiceIDs
        ));
    }

    static async selectAll(dbs) {
        return await mapLocalMetricServices(dbs, await dball(dbs, `
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

        return await mapLocalMetricServices(dbs, await dball(dbs, `
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
                return await mapLocalMetricServices(dbs, await dball(dbs, `
                    SELECT SUP.Permission_Extent, LMS.*, S.*
                      FROM Local_Metric_Services LMS
                      JOIN Services_Users_Permissions SUP ON LMS.Service_ID = SUP.Service_ID
                      JOIN Services S ON LMS.Service_ID = S.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()}));
            },
            permissionBitsToCheck
        );
    }

    /**
     * @param {Databases} dbs
     * @param {User} user
     * @param {string} serviceName
     */
    static async userInsert(dbs, user, serviceName) {
        await dbBeginTransaction(dbs);

        const serviceID = await Services.insert(dbs, serviceName);
        await ServicesUsersPermissions.insert(dbs, serviceID, user.id(), PERMISSION_BITS.ALL);
        const hasMetricFromLocalMetricServiceTag = await LocalTags.insert(
            dbs,
            normalPreInsertLocalTag(`system:has metric from local metric service:${serviceName}`, "System generated"),
            SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID
        );
        await dbrun(dbs, `
            INSERT INTO Local_Metric_Services(
                Service_ID,
                Has_Metric_From_Local_Metric_Service_Tag_ID,
                User_Editable
            ) VALUES (
                $serviceID,
                $hasMetricFromLocalMetricServiceTagID,
                1 
            );
        `, {
            $serviceID: serviceID,
            $hasMetricFromLocalMetricServiceTagID: Number(hasMetricFromLocalMetricServiceTag.Tag_ID)
        });

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
 * @property {bigint} Local_Applied_Metric_Tag_ID
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
 * @param {DBAppliedMetric} dbAppliedMetric 
 */
function mapDBAppliedMetric(dbAppliedMetric) {
    return {
        ...dbAppliedMetric,
        Local_Applied_Metric_Tag_ID: BigInt(dbAppliedMetric.Local_Applied_Metric_Tag_ID)
    };
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
        Local_Applied_Metric_PK_Hash: `${preInsertAppliedMetric.Local_Metric_ID}\x01${preInsertAppliedMetric.User_ID}\x01${preInsertAppliedMetric.Applied_Value}`
    }));
}

export class AppliedMetrics {
    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertAppliedMetric[]} appliedMetrics 
     */
    static async selectMany(dbs, appliedMetrics) {
        if (appliedMetrics.length === 0) {
            return [];
        }

        /** @type {DBAppliedMetric[]} */
        const dbAppliedMetrics = await dball(dbs,
            `SELECT * FROM Local_Applied_Metrics WHERE Local_Applied_Metric_PK_Hash IN ${dbvariablelist(appliedMetrics.length)};`,
            appliedMetrics.map(appliedMetric => appliedMetric.Local_Applied_Metric_PK_Hash)
        );
        return dbAppliedMetrics.map(mapDBAppliedMetric);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertAppliedMetric[]} appliedMetrics 
     */
    static async insertMany(dbs, appliedMetrics) {
        if (appliedMetrics.length === 0) {
            return [];
        }

        const insertedAppliedMetricTags = await LocalTags.insertMany(dbs, appliedMetrics.map(appliedMetric => ({
            Source_Name: "System generated",
            Display_Name: `system:applied metric:${appliedMetric.Applied_Value} on ${appliedMetric.Local_Metric_Name} with user ${appliedMetric.User_Name}`,
            Lookup_Name: `system:applied metric:${appliedMetric.Applied_Value} on ${appliedMetric.Local_Metric_ID} with user ${appliedMetric.User_ID}`
        })), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const appliedMetricsInsertionParams = [];
        for (let i = 0; i < appliedMetrics.length; ++i) {
            const appliedMetric = appliedMetrics[i];
            appliedMetricsInsertionParams.push(appliedMetric.Local_Metric_ID);
            appliedMetricsInsertionParams.push(appliedMetric.User_ID);
            appliedMetricsInsertionParams.push(appliedMetric.Applied_Value);
            appliedMetricsInsertionParams.push(appliedMetric.Local_Applied_Metric_PK_Hash);
            appliedMetricsInsertionParams.push(Number(insertedAppliedMetricTags[i].Tag_ID));
        }

        /** @type {DBAppliedMetric[]} */
        const insertedDBAppliedMetrics = await dball(dbs, `
            INSERT INTO Local_Applied_Metrics(
                Local_Metric_ID,
                User_ID,
                Applied_Value,
                Local_Applied_Metric_PK_Hash,
                Local_Applied_Metric_Tag_ID
            ) VALUES ${dbtuples(appliedMetrics.length, 5)} RETURNING *;
            `, appliedMetricsInsertionParams
        );
        return insertedDBAppliedMetrics.map(mapDBAppliedMetric);
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
        await dbBeginTransaction(dbs);

        const appliedMetric = await AppliedMetrics.upsert(dbs, preInsertAppliedMetric);

        const taggables = await Taggables.searchWithUser(dbs, PerfTags.searchTag(localTag.Tag_ID), user);
        await AppliedMetrics.applyToTaggables(dbs, taggables.map(taggable => taggable.Taggable_ID), appliedMetric);

        if (deleteExistingTag) {
            await LocalTags.delete(dbs, localTag);
        }

        dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {DBAppliedMetric} appliedMetric 
     */
    static async applyToTaggables(dbs, taggableIDs, appliedMetric) {
        await dbs.perfTags.insertTagPairings(new Map([[appliedMetric.Local_Applied_Metric_Tag_ID, taggableIDs]]));
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
 * @property {bigint} Has_Local_Metric_Tag_ID
 * @property {string} Local_Metric_Name
 * @property {number} Local_Metric_Lower_Bound
 * @property {number} Local_Metric_Upper_Bound
 * @property {number} Local_Metric_Precision
 * @property {number} Local_Metric_Type
 */

/**
 * @param {DBLocalMetric} dbLocalMetric 
 */
function mapDBLocalMetric(dbLocalMetric) {
    return {
        ...dbLocalMetric,
        Has_Local_Metric_Tag_ID: BigInt(dbLocalMetric.Has_Local_Metric_Tag_ID)
    };
}

export class LocalMetrics {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricIDs 
     */
    static async selectManyByIDs(dbs, localMetricIDs) {
        /** @type {DBLocalMetric[]} */
        const dbLocalMetrics = await dball(dbs, `
            SELECT *
              FROM Local_Metrics
             WHERE Local_Metric_ID IN ${dbvariablelist(localMetricIDs.length)}
            ;`, localMetricIDs
        );

        return dbLocalMetrics.map(mapDBLocalMetric);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localMetricServiceIDs
     */
    static async selectManyByLocalMetricServiceIDs(dbs, localMetricServiceIDs) {
        /** @type {DBLocalMetric[]} */
        const dbLocalMetrics = await dball(dbs, `
            SELECT *
              FROM Local_Metrics
             WHERE Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)}
            ;`, localMetricServiceIDs
        );

        return dbLocalMetrics.map(mapDBLocalMetric);
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertLocalMetric} preInsertLocalMetric
     * @param {number} localMetricServiceID
     */
    static async insert(dbs, preInsertLocalMetric, localMetricServiceID) {
        await dbBeginTransaction(dbs);

        if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Lower_Bound)) {
            preInsertLocalMetric.Local_Metric_Lower_Bound = null;
        }
        if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Upper_Bound)) {
            preInsertLocalMetric.Local_Metric_Upper_Bound = null;
        }

        const hasLocalMetricTag = await LocalTags.insert(
            dbs,
            normalPreInsertLocalTag(`system:has local metric:${preInsertLocalMetric.Local_Metric_Name}`, "System generated"),
            SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID
        );

        await dbrun(dbs, `
            INSERT INTO Local_Metrics(
                Local_Metric_Service_ID,
                Local_Metric_Name,
                Local_Metric_Lower_Bound,
                Local_Metric_Upper_Bound,
                Local_Metric_Precision,
                Local_Metric_Type,
                Has_Local_Metric_Tag_ID
            ) VALUES (
                $localMetricServiceID,
                $localMetricName,
                $localMetricLowerBound,
                $localMetricUpperBound,
                $localMetricPrecision,
                $localMetricType,
                $hasLocalMetricTagID
            );
        `, {
            $localMetricServiceID: localMetricServiceID,
            $localMetricName: preInsertLocalMetric.Local_Metric_Name,
            $localMetricLowerBound: preInsertLocalMetric.Local_Metric_Lower_Bound,
            $localMetricUpperBound: preInsertLocalMetric.Local_Metric_Upper_Bound,
            $localMetricPrecision: preInsertLocalMetric.Local_Metric_Precision,
            $localMetricType: preInsertLocalMetric.Local_Metric_Type,
            $hasLocalMetricTagID: Number(hasLocalMetricTag.Tag_ID)
        });

        await dbEndTransaction(dbs);
    }
};