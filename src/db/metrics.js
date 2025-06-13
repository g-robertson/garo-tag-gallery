
/** @import {DBService} from "./services.js" */
/** @import {DBUser, PermissionInt} from "./user.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */

import { normalPreInsertLocalTag, SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../client/js/user.js";
import { dball, dbBeginTransaction, dbEndTransaction, dbget, dbrun, dbvariablelist } from "./db-util.js";
import { insertService, insertServiceUserPermission, userSelectAllSpecificTypedServicesHelper } from "./services.js"
import { insertLocalTag } from "./tags.js";

/**
 * @typedef {Object} DBLocalMetricService
 * @property {number} Local_Metric_Service_ID
 * @property {number} Service_ID
 * @property {bigint} Has_Metric_From_Local_Metric_Service_Tag_ID
 */

/**
 * @typedef {DBLocalMetricService & DBService} DBJoinedLocalMetricService
 */
/** @typedef {DBJoinedLocalMetricService & {Permission_Extent: PermissionInt}} DBPermissionedLocalMetricService */

/**
 * @param {DBJoinedLocalMetricService} localMetricService 
 */
function mapLocalMetricService(localMetricService) {
    if (localMetricService === undefined) {
        return undefined;
    }

    return {
        ...localMetricService,
        Has_Metric_From_Local_Metric_Service_Tag_ID: BigInt(localMetricService.Has_Metric_From_Local_Metric_Service_Tag_ID)
    };
}

/**
 * @param {Databases} dbs 
 * @param {number[]} localMetricServiceIDs
 */
export async function selectLocalMetricServices(dbs, localMetricServiceIDs) {
    /** @type {DBJoinedLocalMetricService[]} */
    const localMetricServices = await dball(dbs, `
        SELECT *
          FROM Local_Metric_Services LMS
          JOIN Services S ON LMS.Service_ID = S.Service_ID
          WHERE LMS.Local_Metric_Service_ID IN ${dbvariablelist(localMetricServiceIDs.length)};`, localMetricServiceIDs
    );

    return localMetricServices.map(mapLocalMetricService);
}

/**
 * @param {Databases} dbs 
 * @param {User} user
 * @param {PermissionInt} permissionBitsToCheck
 * @param {number[]} localMetricServiceIDs
 * @returns {Promise<DBJoinedLocalMetricService[]>}
 */
export async function userSelectLocalMetricServices(dbs, user, permissionBitsToCheck, localMetricServiceIDs) {
    if (user.isSudo() || user.hasPermissions(permissionBitsToCheck, PERMISSIONS.LOCAL_TAG_SERVICES)) {
        return await selectLocalMetricServices(dbs, localMetricServiceIDs);
    }

    /** @type {DBJoinedLocalMetricService[]} */
    const localMetricServices = await dball(dbs, `
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
    ]);

    return localMetricServices.map(mapLocalMetricService);
}

/**
 * @param {Databases} dbs 
 * @param {User} user 
 * @param {PermissionInt} permissionBitsToCheck 
 * @param {number} localMetricServiceID
 */
export async function userSelectLocalMetricService(dbs, user, permissionBitsToCheck, localMetricServiceID) {
    return (await userSelectLocalMetricServices(dbs, user, permissionBitsToCheck, [localMetricServiceID]))[0];
}

export async function selectAllLocalMetricServices(dbs) {
    /** @type {DBJoinedLocalMetricService[]} */
    const localMetricServices = await dball(dbs, `
        SELECT *
          FROM Local_Metric_Services LMS
          JOIN Services S ON LMS.Service_ID = S.Service_ID;
    `);
    return localMetricServices.map(mapLocalMetricService);
}

/**
 * @param {Databases} dbs 
 * @param {User} user 
 * @param {PermissionInt=} permissionBitsToCheck
 */
export async function userSelectAllLocalMetricServices(dbs, user, permissionBitsToCheck) {
    const userSelectedPermissionedLocalMetricServices = await userSelectAllSpecificTypedServicesHelper(
        dbs,
        user,
        PERMISSIONS.LOCAL_METRIC_SERVICES,
        selectAllLocalMetricServices,
        async () => {
            return await dball(dbs, `
                SELECT SUP.Permission_Extent, LMS.*, S.*
                  FROM Local_Metric_Services LMS
                  JOIN Services_Users_Permissions SUP ON LMS.Service_ID = SUP.Service_ID
                  JOIN Services S ON LMS.Service_ID = S.Service_ID
                 WHERE SUP.User_ID = $userID;
            `, {$userID: user.id()});
        },
        permissionBitsToCheck
    );

    return userSelectedPermissionedLocalMetricServices.map(mapLocalMetricService);
}

/**
 * @param {Databases} dbs
 * @param {User} user
 * @param {string} serviceName
 */
export async function userCreateLocalMetricService(dbs, user, serviceName) {
    await dbBeginTransaction(dbs);

    const serviceID = await insertService(dbs, serviceName);
    await insertServiceUserPermission(dbs, serviceID, user.id(), PERMISSION_BITS.ALL);
    const hasMetricFromLocalMetricServiceTag = await insertLocalTag(
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

/**
 * @typedef {Object} PreInsertLocalMetric
 * @property {string} Local_Metric_Name
 * @property {number} Local_Metric_Lower_Bound
 * @property {number} Local_Metric_Upper_Bound
 * @property {number} Local_Metric_Precision
 * @property {number} Local_Metric_Type
 */

/**
 * @param {Databases} dbs
 * @param {PreInsertLocalMetric} preInsertLocalMetric
 * @param {number} localMetricServiceID
 */
export async function createLocalMetric(dbs, preInsertLocalMetric, localMetricServiceID) {
    await dbBeginTransaction(dbs);

    if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Lower_Bound)) {
        preInsertLocalMetric.Local_Metric_Lower_Bound = null;
    }
    if (!Number.isFinite(preInsertLocalMetric.Local_Metric_Upper_Bound)) {
        preInsertLocalMetric.Local_Metric_Upper_Bound = null;
    }

    const hasLocalMetricTag = await insertLocalTag(
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