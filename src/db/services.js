import { User } from "../client/js/user.js";
import {dbBeginTransaction, dbEndTransaction, dbget, dbrun} from "./db-util.js";

/** @import {Permission} from "../client/js/user.js" */
/** @import {Databases} from "./db-util.js" */

/**
 * @typedef {Object} DBService
 * @property {number} Service_ID
 * @property {string} Service_Name
 */


/** @template T, PrimaryKeyColumnName
 * @param {Databases} dbs 
 * @param {User} user 
 * @param {(dbs: Databases) => Promise<T[]>} selectAllSpecificTypedServices
 * @param {() => Promise<({[PrimaryKeyColumnName: string]: number} & {Permission: string})[]>} selectAllUserPermissionedSpecificTypedServices
 * @param {keyof T} primaryKeyColumnName
 * @param {(Permission | Permission[])=} permissionsToCheck
 */
export async function userSelectAllSpecificTypedServicesHelper(
    dbs,
    user,
    selectAllSpecificTypedServices,
    selectAllUserPermissionedSpecificTypedServices,
    primaryKeyColumnName,
    permissionsToCheck
) {
    permissionsToCheck ??= [];
    if (!(permissionsToCheck instanceof Array)) {
        permissionsToCheck = [permissionsToCheck];
    }

    let giveAllSpecificTypedServicesPermission = user.permissions();
    if (user.isSudo()) {
        permissionsToCheck = [];
    }

    /** @type {Map<number, T & {Permissions: Set<string>}} */
    const specificServicesMap = new Map();
    for (const specificService of await selectAllSpecificTypedServices(dbs)) {
        specificServicesMap.set(specificService[primaryKeyColumnName], {
            ...specificService,
            Permissions: giveAllSpecificTypedServicesPermission
        });
    }

    const permissionedSpecificServices = await selectAllUserPermissionedSpecificTypedServices();

    for (const permissionedSpecificService of permissionedSpecificServices) {
        const insertedService = specificServicesMap.get(permissionedSpecificService[primaryKeyColumnName]);
        insertedService.Permissions.add(permissionedSpecificService.Permission);
    }
    
    return [...specificServicesMap.values()].filter(specificService => permissionsToCheck.every(permission => specificService.Permissions.has(permission.name)));
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
     * @param {string} permission 
     */
    static async insert(dbs, serviceID, userID, permission) {
        if (!Number.isSafeInteger(serviceID) || !Number.isSafeInteger(userID) || typeof permission !== "string") {
            throw "Bad call to insertServiceUserPermission";
        }

        await dbrun(dbs, `
            INSERT INTO Services_Users_Permissions(
                Service_ID,
                User_ID,
                Permission
            ) VALUES (
                $serviceID,
                $userID,
                $permission
            );
        `, {
            $serviceID: serviceID,
            $userID: userID,
            $permission: permission
        });
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} serviceID 
     * @param {number} userID 
     * @param {string[]} permissions
     */
    static async insertMany(dbs, serviceID, userID, permissions) {
        for (const permission of permissions) {
            await ServicesUsersPermissions.insert(dbs, serviceID, userID, permission);
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {number} serviceID 
     */
    static async deleteByServiceID(dbs, serviceID) {
        await dbrun(dbs, "DELETE FROM Services_Users_Permissions WHERE Service_ID = $serviceID;", { $serviceID: serviceID });
    }
};

