import { createFromLocalURLGeneratorLookupName, createFromLocalURLGeneratorServiceLookupName } from "../client/js/url-generators.js";
import { PERMISSIONS } from "../client/js/user.js";
import { dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { LocalTags } from "./tags.js";

/** @import {DBService} from "./services.js" */
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
/** @typedef {DBJoinedLocalURLGeneratorService & {Permissions: Set<string>}} DBPermissionedLocalURLGeneratorService */

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
     * @param {string[]} permissionsToCheck
     * @param {number[]} localURLGeneratorServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionsToCheck, localURLGeneratorServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionsToCheck)) {
            return await LocalURLGeneratorServices.selectManyByIDs(dbs, localURLGeneratorServiceIDs);
        }

        /** @type {DBJoinedLocalURLGeneratorService[]} */
        const localURLGeneratorServices = await dballselect(dbs, `
            SELECT LUGS.*, S.*
            FROM Local_URL_Generator_Services LUGS
            JOIN Services_Users_Permissions SUP ON LUGS.Service_ID = SUP.Service_ID
            JOIN Services S ON LUGS.Service_ID = S.Service_ID
            WHERE (
                SELECT COUNT(1)
                FROM Services_Users_Permissions SUP
                WHERE LMS.Service_ID = SUP.Service_ID
                AND SUP.User_ID = ?
                AND SUP.Permission IN ${dbvariablelist(permissionsToCheck.length)}
            ) = ?
            AND LUGS.Local_URL_Generator_Service_ID IN ${dbvariablelist(localURLGeneratorServiceIDs.length)};
        `, [
            user.id(),
            permissionsToCheck,
            permissionsToCheck.length,
            ...localURLGeneratorServiceIDs
        ]);

        return localURLGeneratorServices;
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]} permissionsToCheck 
     * @param {number} localURLGeneratorServiceID
     */
    static async userSelectByID(dbs, user, permissionsToCheck, localURLGeneratorServiceID) {
        return (await LocalURLGeneratorServices.userSelectManyByIDs(dbs, user, permissionsToCheck, [localURLGeneratorServiceID]))[0];
    }
    
    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]=} permissionsToCheck
     */
    static async userSelectAll(dbs, user, permissionsToCheck) {
        return await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            LocalURLGeneratorServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT LUGS.Local_URL_Generator_Service_ID, SUP.Permission
                      FROM Local_URL_Generator_Services LUGS
                      JOIN Services_Users_Permissions SUP ON LUGS.Service_ID = SUP.Service_ID
                     WHERE SUP.User_ID = ?;
                `, [user.id()]);
            },
            "Local_URL_Generator_Service_ID",
            permissionsToCheck
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
        await ServicesUsersPermissions.insertMany(dbs, serviceID, user.id(), Object.values(PERMISSIONS.LOCAL_URL_GENERATOR_SERVICES).map(permission => permission.name));

        /** @type {number} */
        const localURLGeneratorServiceID = (await dbget(dbs, `
            INSERT INTO Local_URL_Generator_Services(
                Service_ID
            ) VALUES (
                ?
            ) RETURNING Local_URL_Generator_Service_ID;
        `, [serviceID])).Local_URL_Generator_Service_ID;
        
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
               SET Local_URL_Generator_Name = ?,
                   Local_URL_Generator_JSON = ?
             WHERE Local_URL_Generator_ID = ?;
        `, [
            preInsertURLGenerator.Local_URL_Generator_Name,
            preInsertURLGenerator.Local_URL_Generator_JSON,
            localURLGeneratorID
        ])
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
        `, [
            preInsertURLGenerator.Local_URL_Generator_Name,
            preInsertURLGenerator.Local_URL_Generator_JSON,
            localURLGeneratorServiceID,
        ])).Local_URL_Generator_ID;
        
        await LocalTags.insertSystemTag(dbs, createFromLocalURLGeneratorLookupName(localURLGeneratorID));

        await dbEndTransaction(dbs);
    }
}