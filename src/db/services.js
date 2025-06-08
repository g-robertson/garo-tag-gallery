import { PERMISSION_BITS, User } from "../client/js/user.js";

/** @import {PermissionType, PermissionInt} from "../client/js/user.js" */
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
 * @returns 
 */
export async function userSelectAllSpecificTypedServicesHelper(dbs, user, specificServicePermissionType, selectAllSpecificTypedServices, selectAllUserPermissionedSpecificTypedServices) {
    
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
                specificServicesMap.set(specificService.Local_Tag_Service_ID, {
                    ...specificService,
                    Permission_Extent: giveAllSpecificTypedServicesPermission
                });
            }

            for (const permissionedSpecificService of permissionedSpecificServices) {
                const preExistingPermission = specificServicesMap.get(permissionedSpecificService.Local_Tag_Service_ID).Permission_Extent ?? 0;
                specificServicesMap.set(permissionedSpecificService.Local_Tag_Service_ID, {
                    ...permissionedSpecificService,
                    Permission_Extent: preExistingPermission | permissionedSpecificService.Permission_Extent
                });
            }
            
            returnedSpecificServices = [...specificServicesMap.values()];
        } else {
            returnedSpecificServices = permissionedSpecificServices;
        }
    }

    return returnedSpecificServices;
}