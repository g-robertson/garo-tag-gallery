import { User } from "../client/js/user.js";
import { dball, dbget, dbvariablelist } from "./db-util.js";
import { LocalTagServices } from "./tags.js";
import { LocalTaggableServices } from "./taggables.js";
import { LocalMetricServices } from "./metrics.js";

/**
 * @import {DBBoolean} from "./db-util.js"
 * @import {PermissionInt} from "../client/js/user.js"
 * @import {DBPermissionedLocalTagService} from "./tags.js"
 * @import {DBPermissionedLocalTaggableService} from "./taggables.js"
 * @import {DBPermissionedLocalMetricService} from "./metrics.js"
 */
export const DEFAULT_ADMINISTRATOR_USER_ID = 0;
export const DEFAULT_ADMINISTRATOR_PERMISSION_ID = 0;

/**
 * @typedef {Object} DBPermissionSet
 * @property {number} Permission_Set_ID
 * @property {string} Permission_Set_Name
 * @property {PermissionInt} User_Management_Permission
 * @property {PermissionInt} Local_Taggable_Services_Permission
 * @property {number | null} Local_Taggable_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_Taggable_Services_Permission
 * @property {number | null} Global_Taggable_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Local_Rating_Services_Permission
 * @property {number | null} Local_Rating_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_Rating_Services_Permission
 * @property {number | null} Global_Rating_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Local_Tag_Services_Permission
 * @property {number | null} Local_Tag_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_Tag_Services_Permission
 * @property {number | null} Global_Tag_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Local_Tag_Relations_Services_Permission
 * @property {number | null} Local_Tag_Relations_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_Tag_Relations_Services_Permission
 * @property {number | null} Global_Tag_Relations_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Local_URL_Generator_Services_Permission
 * @property {number | null} Local_URL_Generator_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_URL_Generator_Services_Permission
 * @property {number | null} Global_URL_Generator_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Local_URL_Classifier_Services_Permission
 * @property {number | null} Local_URL_Classifier_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_URL_Classifier_Services_Permission
 * @property {number | null} Global_URL_Classifier_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Local_Parser_Services_Permission
 * @property {number | null} Local_Parser_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Global_Parser_Services_Permission
 * @property {number | null} Global_Parser_Services_Byte_Transfer_Limit
 * @property {PermissionInt} Settings_Permission
 * @property {PermissionInt} Advanced_Settings_Permission
 */

/**
 * @typedef {Object} DBUser
 * @property {number} User_ID
 * @property {string} User_Name
 * @property {DBBoolean} Is_Administrator
 * @property {number} Permission_Set_ID
 * @property {Page[]} JSON_Pages
 * @property {Object} JSON_Preferences
 * @property {number} User_Created_Date
 */

/**
 * @typedef {DBUser &
 *           DBPermissionSet &
 *          {
 *              Local_Tag_Services: (DBPermissionedLocalTagService)[],
 *              Local_Taggable_Services: (DBPermissionedLocalTaggableService)[]
 *              Local_Metric_Services: (DBPermissionedLocalMetricService)[]
 *          }
 * } DBJoinedUser
 */

/**
 * @param {DBUser} dbUser 
 */
function mapDBUser(dbUser) {
    const mappedDBUser = {...dbUser};
    delete mappedDBUser['Access_Key'];
    return mappedDBUser;
}

export class Users {
    
    /**
     * @param {Databases} dbs
     * @param {number[]} userIDs
     */
    static async selectManyByIDs(dbs, userIDs) {
        /** @type {DBUser[]} */
        const dbUsers = (await dball(dbs, `SELECT * FROM Users WHERE User_ID IN ${dbvariablelist(userIDs.length)};`, userIDs));

        return dbUsers.map(mapDBUser);
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

        return user;
    }

    /**
     * @param {Databases} dbs
     * @param {string} accessKey
     */
    static async selectByAccessKey(dbs, accessKey) {
        const user = await dbget(dbs, `
            SELECT *
              FROM Users
              JOIN Permission_Sets ON Users.Permission_Set_ID = Permission_Sets.Permission_Set_ID
              WHERE Users.Access_Key = ?;`, [accessKey]
        );
        
        if (user === undefined) {
            return undefined;
        } else {
            return new User(user);
        }
    }

    /**
     * @param {Databases} dbs
     * @returns {Promise<DBUser>}
     */
    static async selectDefaultAdminUser(dbs) {
        return await dbget(dbs, `SELECT * FROM Users WHERE User_ID = ?`, [DEFAULT_ADMINISTRATOR_USER_ID]);
    }
}
