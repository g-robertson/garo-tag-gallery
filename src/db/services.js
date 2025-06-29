import { PERMISSION_BITS, User } from "../client/js/user.js";
import {dbBeginTransaction, dbEndTransaction, dbget, dbrun} from "./db-util.js";

/** @import {PermissionInt} from "../client/js/user.js" */
/** @import {Databases} from "./db-util.js" */

/**
 * @typedef {Object} DBService
 * @property {number} Service_ID
 * @property {string} Service_Name
 */


/** @template T
 * @param {Databases} dbs 
 * @param {User} user 
 * @param {PermissionType} specificServicePermissionType 
 * @param {(dbs: Databases) => Promise<T[]>} selectAllSpecificTypedServices
 * @param {() => Promise<T & {Permission_Extent: PermissionInt}>} selectAllUserPermissionedSpecificTypedServices
 * @param {keyof T} primaryKeyColumnName
 * @param {PermissionInt=} permissionBitsToCheck
 */
export async function userSelectAllSpecificTypedServicesHelper(
    dbs,
    user,
    specificServicePermissionType,
    selectAllSpecificTypedServices,
    selectAllUserPermissionedSpecificTypedServices,
    primaryKeyColumnName,
    permissionBitsToCheck
) {
    permissionBitsToCheck ??= PERMISSION_BITS.NONE;

    /** @type {(T & {Permission_Extent: PermissionInt})[]} */
    let returnedSpecificServices = [];
    let giveAllSpecificTypedServicesPermission = 0;
    if (user.isSudo()) {
        giveAllSpecificTypedServicesPermission = PERMISSION_BITS.ALL;
    } else {
        giveAllSpecificTypedServicesPermission = user.getPermission(specificServicePermissionType);
    }

    if (giveAllSpecificTypedServicesPermission === PERMISSION_BITS.ALL) {
        returnedSpecificServices = (await selectAllSpecificTypedServices(dbs)).map(dbSpecificService => ({
            ...dbSpecificService,
            Permission_Extent: PERMISSION_BITS.ALL
        }));
    } else {
        /** @type {(T & {Permission_Extent: PermissionInt})[]} */
        const permissionedSpecificServices = await selectAllUserPermissionedSpecificTypedServices(); 
        if (giveAllSpecificTypedServicesPermission !== 0) {
            /** @type {Map<number, T & {Permission_Extent: PermissionInt}} */
            const specificServicesMap = new Map();
            for (const specificService of await selectAllSpecificTypedServices(dbs)) {
                specificServicesMap.set(specificService[primaryKeyColumnName], {
                    ...specificService,
                    Permission_Extent: giveAllSpecificTypedServicesPermission
                });
            }

            for (const permissionedSpecificService of permissionedSpecificServices) {
                const preExistingPermission = specificServicesMap.get(permissionedSpecificService[primaryKeyColumnName]).Permission_Extent ?? 0;
                specificServicesMap.set(permissionedSpecificService[primaryKeyColumnName], {
                    ...permissionedSpecificService,
                    Permission_Extent: preExistingPermission | permissionedSpecificService.Permission_Extent
                });
            }
            
            returnedSpecificServices = [...specificServicesMap.values()];
        } else {
            returnedSpecificServices = permissionedSpecificServices;
        }
    }

    return returnedSpecificServices.filter(specificService => (specificService.Permission_Extent & permissionBitsToCheck) === permissionBitsToCheck);
}

export class Services {
    /**
     * @param {Databases} dbs 
     * @param {string} serviceName 
     */
    static async insert(dbs, serviceName) {
        /** @type {number} */
        const serviceID = (await dbget(dbs, `
            INSERT INTO Services(
                Service_Name
            ) VALUES (
                ?
            ) RETURNING Service_ID;
        `, serviceName)).Service_ID;

        return serviceID;
    }

    /**
     * @param {Databases} dbs
     * @param {number} serviceID
     * @param {string} serviceName 
     */
    static async update(dbs, serviceID, serviceName) {
        await dbrun(dbs, `
            UPDATE Services
               SET Service_Name = $serviceName
             WHERE Service_ID = $serviceID;    
        `, {$serviceID: serviceID, $serviceName: serviceName});
    }

    /**
     * @param {Databases} dbs 
     * @param {number} serviceID 
     */
    static async deleteByID(dbs, serviceID) {
        dbs = await dbBeginTransaction(dbs);
        await ServicesUsersPermissions.deleteByServiceID(dbs, serviceID);
        await dbrun(dbs, "DELETE FROM Services WHERE Service_ID = $serviceID;", { $serviceID: serviceID });

        await dbEndTransaction(dbs);
    }
};

export class ServicesUsersPermissions {
    /**
     * @param {Databases} dbs 
     * @param {number} serviceID 
     * @param {number} userID 
     * @param {PermissionInt} permissionExtent 
     */
    static async insert(dbs, serviceID, userID, permissionExtent) {
        if (!Number.isSafeInteger(serviceID) || !Number.isSafeInteger(userID) || !Number.isSafeInteger(permissionExtent)) {
            throw "Bad call to insertServiceUserPermission";
        }

        await dbrun(dbs, `
            INSERT INTO Services_Users_Permissions(
                Service_ID,
                User_ID,
                Permission_Extent
            ) VALUES (
                $serviceID,
                $userID,
                $permissionExtent 
            );
        `, {
            $serviceID: serviceID,
            $userID: userID,
            $permissionExtent: permissionExtent
        });
    }

    /**
     * @param {Databases} dbs 
     * @param {number} serviceID 
     */
    static async deleteByServiceID(dbs, serviceID) {
        await dbrun(dbs, "DELETE FROM Services_Users_Permissions WHERE Service_ID = $serviceID;", { $serviceID: serviceID });
    }
};

