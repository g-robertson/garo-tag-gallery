import { createFromLocalURLGeneratorLookupName, createFromLocalURLGeneratorServiceLookupName } from "../client/js/url-generators.js";
import { PERMISSION_BITS, PERMISSIONS } from "../client/js/user.js";
import { dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { LocalTags } from "./tags.js";

/** @import {DBService} from "./services.js" */
/** @import {PermissionInt} from "./user.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */

/**
 * @typedef {Object} DBLocalURLGeneratorService
 * @property {number} Local_URL_Generator_Service_ID
 * @property {bigint} From_Local_URL_Generator_Tag_ID
 */

/**
 * @typedef {DBLocalURLGeneratorService & DBService} DBJoinedLocalURLGeneratorService
 */
/** @typedef {DBJoinedLocalURLGeneratorService & {Permission_Extent: PermissionInt}} DBPermissionedLocalURLGeneratorService */

export class LocalURLGeneratorServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localURLGeneratorServiceIDs 
     */
    static async selectTagMappings(dbs, localURLGeneratorServiceIDs) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, localURLGeneratorServiceIDs.map(createFromLocalURLGeneratorServiceLookupName));
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localURLGeneratorServiceID 
     */
    static async selectTagMapping(dbs, localURLGeneratorServiceID) {
        return (await LocalURLGeneratorServices.selectTagMappings(dbs, [localURLGeneratorServiceID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localURLGeneratorServiceIDs
     */
    static async selectManyByIDs(dbs, localURLGeneratorServiceIDs) {
        /** @type {DBJoinedLocalURLGeneratorService[]} */
        const localURLGeneratorServices = await dballselect(dbs, `
            SELECT *
              FROM Local_URL_Generator_Services LUGS
              JOIN Services S ON LUGS.Service_ID = S.Service_ID
              WHERE LUGS.Local_URL_Generator_Service_ID IN ${dbvariablelist(localURLGeneratorServiceIDs.length)};`, localURLGeneratorServiceIDs
        );

        return localURLGeneratorServices;
    }

    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBJoinedLocalURLGeneratorService[]} */
        const localURLGeneratorServices = await dballselect(dbs, `
            SELECT *
              FROM Local_URL_Generator_Services LUGS
              JOIN Services S ON LUGS.Service_ID = S.Service_ID;
        `);
        return localURLGeneratorServices;
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {PermissionInt} permissionBitsToCheck
     * @param {number[]} localURLGeneratorServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionBitsToCheck, localURLGeneratorServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionBitsToCheck, PERMISSIONS.LOCAL_TAG_SERVICES)) {
            return await LocalURLGeneratorServices.selectManyByIDs(dbs, localURLGeneratorServiceIDs);
        }

        /** @type {DBJoinedLocalURLGeneratorService[]} */
        const localURLGeneratorServices = await dballselect(dbs, `
            SELECT LUGS.*, S.*
              FROM Local_URL_Generator_Services LUGS
              JOIN Services_Users_Permissions SUP ON LUGS.Service_ID = SUP.Service_ID
              JOIN Services S ON LUGS.Service_ID = S.Service_ID
             WHERE SUP.User_ID = ?
               AND (SUP.Permission_Extent & ?) = ?
               AND LUGS.Local_URL_Generator_Service_ID IN ${dbvariablelist(localURLGeneratorServiceIDs.length)};
        `, [
            user.id(),
            permissionBitsToCheck,
            permissionBitsToCheck,
            ...localURLGeneratorServiceIDs
        ]);

        return localURLGeneratorServices;
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {PermissionInt} permissionBitsToCheck 
     * @param {number} localURLGeneratorServiceID
     */
    static async userSelectByID(dbs, user, permissionBitsToCheck, localURLGeneratorServiceID) {
        return (await LocalURLGeneratorServices.userSelectManyByIDs(dbs, user, permissionBitsToCheck, [localURLGeneratorServiceID]))[0];
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
            PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
            LocalURLGeneratorServices.selectAll,
            async () => {
                return (await dballselect(dbs, `
                    SELECT SUP.Permission_Extent, LUGS.*, S.*
                      FROM Local_URL_Generator_Services LUGS
                      JOIN Services_Users_Permissions SUP ON LUGS.Service_ID = SUP.Service_ID
                      JOIN Services S ON LUGS.Service_ID = S.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()}));
            },
            "Local_URL_Generator_Service_ID",
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
        const localURLGeneratorServiceID = (await dbget(dbs, `
            INSERT INTO Local_URL_Generator_Services(
                Service_ID
            ) VALUES (
                $serviceID
            ) RETURNING Local_URL_Generator_Service_ID;
        `, {
            $serviceID: serviceID
        })).Local_URL_Generator_Service_ID;
        
        await LocalTags.insertSystemTag(dbs, createFromLocalURLGeneratorServiceLookupName(localURLGeneratorServiceID));

        await dbEndTransaction(dbs);
    }
}

/**
 * @typedef {Object} PreInsertURLGenerator
 * @property {string} Local_URL_Generator_Name
 * @property {string} Local_URL_Generator_JSON
 */

export class URLGenerator {
    static async update(dbs, localURLGeneratorID, preInsertURLGenerator) {
        await dbrun(dbs, `
            UPDATE Local_URL_Generators
               SET Local_URL_Generator_Name = $localURLGeneratorName,
                   Local_URL_Generator_JSON = $localURLGeneratorJSON
             WHERE Local_URL_Generator_ID = $localURLGeneratorID;
        `, {
            $localURLGeneratorID: localURLGeneratorID,
            $localURLGeneratorName: preInsertURLGenerator.Local_URL_Generator_Name,
            $localURLGeneratorJSON: preInsertURLGenerator.Local_URL_Generator_JSON
        })
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertURLGenerator} preInsertURLGenerator 
     * @param {number} localURLGeneratorServiceID 
     */
    static async insert(dbs, preInsertURLGenerator, localURLGeneratorServiceID) {
        dbs = await dbBeginTransaction(dbs);

        /** @type {number} */
        const localURLGeneratorID = (await dbget(dbs, `
            INSERT INTO Local_URL_Generators(
                Local_URL_Generator_Service_ID,
                Local_URL_Generator_Name,
                Local_URL_Generator_JSON
            ) VALUES (
                $localURLGeneratorServiceID,
                $localURLGeneratorName,
                $localURLGeneratorJSON
            ) RETURNING Local_URL_Generator_ID;
        `, {
            $localURLGeneratorServiceID: localURLGeneratorServiceID,
            $localURLGeneratorName: preInsertURLGenerator.Local_URL_Generator_Name,
            $localURLGeneratorJSON: preInsertURLGenerator.Local_URL_Generator_JSON
        })).Local_URL_Generator_ID;
        
        await LocalTags.insertSystemTag(dbs, createFromLocalURLGeneratorLookupName(localURLGeneratorID));

        await dbEndTransaction(dbs);
    }
}