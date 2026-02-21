import { User } from "../client/js/user.js";
import { dballselect, dbget, dbgetselect, dbrun, dbvariablelist } from "./db-util.js";
import { LocalTagServices } from "./tags.js";
import { LocalTaggableServices } from "./taggables.js";
import { LocalMetricServices } from "./metrics.js";
import { LocalURLGeneratorServices } from "./url-generators.js";
import { LRUCache } from "./lru-cache.js";

/**
 * @import {DBBoolean} from "./db-util.js"
 * @import {DBPermissionedLocalTagService} from "./tags.js"
 * @import {DBPermissionedLocalTaggableService} from "./taggables.js"
 * @import {DBPermissionedLocalMetricService} from "./metrics.js"
 * @import {DBPermissionedLocalURLGeneratorService} from "./url-generators.js"
 * @import {PageType} from "../client/page/page.jsx"
 */
export const DEFAULT_ADMINISTRATOR_USER_ID = 0;
export const DEFAULT_ADMINISTRATOR_PERMISSION_ID = 0;

/**
 * @typedef {Object} DBPermissionSet
 * @property {number} Permission_Set_ID
 * @property {string} Permission_Set_Name
 */

/**
 * @typedef {Object} DBUser
 * @property {number} User_ID
 * @property {string} User_Name
 * @property {DBBoolean} Is_Administrator
 * @property {number} Permission_Set_ID
 * @property {PageType[]} JSON_Pages
 * @property {Object} JSON_Preferences
 * @property {string[]} Permissions
 * @property {number} User_Created_Date
 */

/**
 * @typedef {DBUser &
 *           DBPermissionSet &
 *          {
 *              Local_Tag_Services: DBPermissionedLocalTagService[],
 *              Local_Taggable_Services: DBPermissionedLocalTaggableService[],
 *              Local_Metric_Services: DBPermissionedLocalMetricService[],
 *              Local_URL_Generator_Services: DBPermissionedLocalURLGeneratorService[]
 *          }
 * } DBJoinedUser
 */

/**
 * @param {Databases} dbs
 * @param {DBUser[]} dbUsers
 */
async function mapDBUsers(dbs, dbUsers) {
    if (dbUsers.length === 0) {
        return [];
    }

    const permissionSetIDs = new Set(dbUsers.map(dbUser => dbUser.Permission_Set_ID));

    /** @type {{Permission_Set_ID: number, Permission: string}[]} */
    const permissionSetPermissions = await dballselect(dbs, `
        SELECT Permission_Set_ID, Permission
        FROM Permission_Sets_Permissions
        WHERE Permission_Set_ID IN ${dbvariablelist(permissionSetIDs.size)};
    `, [...permissionSetIDs]);

    /** @type {Map<number, string[]>} */
    const permissionSetPermissionsMap = new Map([...permissionSetIDs].map(permissionSetID => [permissionSetID, []]));
    for (const permissionSetPermission of permissionSetPermissions) {
        permissionSetPermissionsMap.get(permissionSetPermission.Permission_Set_ID).push(permissionSetPermission.Permission);
    }

    const mappedDBUsers = dbUsers.map(dbUser => ({
        ...dbUser,
        JSON_Pages: JSON.parse(dbUser.JSON_Pages),
        Permissions: permissionSetPermissionsMap.get(dbUser.Permission_Set_ID),
        Access_Key: undefined
    }));
    return mappedDBUsers;
}

export class Users {
    /** @type {LRUCache<string, User>} */
    static #accessKeyToUserLRUCache = new LRUCache(4096);

    /**
     * @param {Databases} dbs 
     * @param {string} accessKey
     * @param {PageType[]} pages
     */
    static async setPagesJSON(dbs, accessKey, pages) {
        await dbrun(dbs, `
            UPDATE Users
            SET JSON_Pages = ?
            WHERE Access_Key = ?
        `, [
            JSON.stringify(pages),
            accessKey
        ]);
        Users.#accessKeyToUserLRUCache.get(accessKey).setPages(pages);
    }

    /**
     * @param {Databases} dbs
     * @param {number[]} userIDs
     */
    static async selectManyByIDs(dbs, userIDs) {
        if (userIDs.length === 0) {
            return [];
        }

        /** @type {DBUser[]} */
        const dbUsers = (await dballselect(dbs, `SELECT * FROM Users WHERE User_ID IN ${dbvariablelist(userIDs.length)};`, userIDs));

        return await mapDBUsers(dbs, dbUsers);
    }

    /**
     * @param {Databases} dbs
     * @param {number} userID
     */
    static async selectByID(dbs, userID) {
        return (await Users.selectManyByIDs(dbs, [userID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     */
    static async joinUsersPermittedObjects(dbs, user) {
        user.setLocalTagServices(await LocalTagServices.userSelectAll(dbs, user));
        user.setLocalTaggableServices(await LocalTaggableServices.userSelectAll(dbs, user));
        user.setLocalMetricServices(await LocalMetricServices.userSelectAll(dbs, user));
        user.setLocalURLGeneratorServices(await LocalURLGeneratorServices.userSelectAll(dbs, user));

        return user;
    }

    /**
     * @param {Databases} dbs
     * @param {string} accessKey
     */
    static async selectByAccessKey(dbs, accessKey) {
        let cachedUser = this.#accessKeyToUserLRUCache.get(accessKey);
        if (cachedUser === undefined) {
            const user = await dbget(dbs, `
                SELECT *
                FROM Users
                WHERE Users.Access_Key = ?;`, [accessKey]
            );

            if (user === undefined) {
                return undefined;
            } else {
                cachedUser = new User((await mapDBUsers(dbs, [user]))[0]);
                this.#accessKeyToUserLRUCache.set(accessKey, cachedUser);
            }
        }
        return cachedUser;
    }

    /**
     * @param {Databases} dbs
     * @returns {Promise<DBUser>}
     */
    static async selectDefaultAdminUser(dbs) {
        return await dbgetselect(dbs, `SELECT * FROM Users WHERE User_ID = ?`, [DEFAULT_ADMINISTRATOR_USER_ID]);
    }
}
