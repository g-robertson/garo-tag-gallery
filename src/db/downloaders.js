import { createFromLocalDownloaderServiceLookupName } from "../client/js/downloaders.js";
import { PERMISSIONS } from "../client/js/user.js";
import { dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun, dbsqlcommand, dbvariablelist } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { insertSystemTag, LocalTags } from "./tags.js";
import { LocalURLParsers } from "./parsers.js";
import { SYSTEM_LOCAL_DOWNLOADER_SERVICE } from "../client/js/defaults.js";

/** @import {DBService} from "./services.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */
/** @import {DBLocalTag} from "./tags.js" */
/** @import {DBLocalURLParser} from "./parsers.js" */

/**
 * @typedef {Object} DBLocalDownloaderService
 * @property {number} Local_Downloader_Service_ID
 * 
 * @typedef {DBLocalDownloaderService & DBService} DBJoinedLocalDownloaderService
 * @typedef {DBJoinedLocalDownloaderService & {From_Local_Downloader_Service_Tag: DBLocalTag, Local_URL_Parsers: DBLocalURLParser[]}} TagMappedDBJoinedLocalDownloaderService
 * @typedef {TagMappedDBJoinedLocalDownloaderService & {Permissions: Set<string>}} DBPermissionedLocalDownloaderService
 **/

/**
 * @param {TagMappedDBJoinedLocalDownloaderService} systemLocalDownloaderService
 */
export function insertSystemLocalDownloaderService(systemLocalDownloaderService) {
    return [
        ...insertSystemTag(systemLocalDownloaderService.From_Local_Downloader_Service_Tag),
        dbsqlcommand(`INSERT INTO Services(
                Service_ID,
                Service_Name
            ) VALUES (
                ?,
                ?
            );
        `, [systemLocalDownloaderService.Service_ID, systemLocalDownloaderService.Service_Name]),
        dbsqlcommand(`
            INSERT INTO Local_Downloader_Services(
                Local_Downloader_Service_ID,
                Service_ID
            ) VALUES (
                ?,
                ?
            );
        `, [systemLocalDownloaderService.Local_Downloader_Service_ID, systemLocalDownloaderService.Service_ID])
    ];
}

/**
 * @param {Databases} dbs
 * @param {DBJoinedLocalDownloaderService[]} localDownloaderServices
 */
async function mapLocalDownloaderServices(dbs, localDownloaderServices) {
    const localURLParsers = await LocalURLParsers.selectManyByLocalDownloaderServiceIDs(dbs, localDownloaderServices.map(localDownloaderService => localDownloaderService.Local_Downloader_Service_ID));
    const tagMappings = await LocalDownloaderServices.selectTagMappings(dbs, localDownloaderServices.map(localDownloaderService => localDownloaderService.Local_Downloader_Service_ID));
    /** @type {Map<number, DBLocalURLParser[]>} */
    const localDownloaderServiceToLocalURLParsersMap = new Map(localDownloaderServices.map(localDownloaderService => [localDownloaderService.Local_Downloader_Service_ID, []]));
    for (const localURLParser of localURLParsers) {
        localDownloaderServiceToLocalURLParsersMap.get(localURLParser.Local_Downloader_Service_ID).push(localURLParser);
    }

    return localDownloaderServices.map((localDownloaderService, i) => ({
        ...localDownloaderService,
        From_Local_Downloader_Service_Tag: tagMappings[i],
        Local_URL_Parsers: localDownloaderServiceToLocalURLParsersMap.get(localDownloaderService.Local_Downloader_Service_ID)
    }));
}

export class LocalDownloaderServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localDownloaderServiceIDs 
     */
    static async selectTagMappings(dbs, localDownloaderServiceIDs) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, localDownloaderServiceIDs.map(createFromLocalDownloaderServiceLookupName));
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localDownloaderServiceID 
     */
    static async selectTagMapping(dbs, localDownloaderServiceID) {
        return (await LocalDownloaderServices.selectTagMappings(dbs, [localDownloaderServiceID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localURLParserIDs
     */
    static async selectManyByLocalDownloaderIDs(dbs, localURLParserIDs) {
        if (localURLParserIDs.length === 0) {
            return [];
        }

        return await mapLocalDownloaderServices(dbs, await dballselect(dbs, `
            SELECT DISTINCT LDS.*, S.*
            FROM Local_Downloader_Services LDS
            JOIN Services S ON LDS.Service_ID = S.Service_ID
            JOIN Local_URL_Parsers LUP ON LDS.Local_Downloader_Service_ID = LUP.Local_Downloader_Service_ID
            WHERE Local_URL_Parser_ID IN ${dbvariablelist(localURLParserIDs.length)}
            `, localURLParserIDs
        ));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} localURLParserID
     */
    static async selectByLocalDownloaderID(dbs, localURLParserID) {
        return (await LocalDownloaderServices.selectManyByLocalDownloaderIDs(dbs, [localURLParserID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localDownloaderServiceIDs
     */
    static async selectManyByIDs(dbs, localDownloaderServiceIDs) {
        if (localDownloaderServiceIDs.length === 0) {
            return [];
        }

        return await mapLocalDownloaderServices(dbs, await dballselect(dbs, `
            SELECT LDS.*, S.*
            FROM Local_Downloader_Services LDS
            JOIN Services S ON LDS.Service_ID = S.Service_ID
            WHERE LDS.Local_Downloader_Service_ID IN ${dbvariablelist(localDownloaderServiceIDs.length)};`,
            localDownloaderServiceIDs
        ));
    }
    /**
     * @param {Databases} dbs 
     * @param {number} localDownloaderServiceID
     */
    static async selectByID(dbs, localDownloaderServiceID) {
        return (await LocalDownloaderServices.selectManyByIDs(dbs, [localDownloaderServiceID]))[0];
    }

    static async selectAll(dbs) {
        return await mapLocalDownloaderServices(dbs, await dballselect(dbs, `
            SELECT LDS.*, S.*
            FROM Local_Downloader_Services LDS
            JOIN Services S ON LDS.Service_ID = S.Service_ID;
        `));
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {string[]} permissionsToCheck
     * @param {number[]} localDownloaderServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionsToCheck, localDownloaderServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionsToCheck)) {
            return await LocalDownloaderServices.selectManyByIDs(dbs, localDownloaderServiceIDs);
        }

        return await mapLocalDownloaderServices(dbs, await dballselect(dbs, `
            SELECT LDS.*, S.*
            FROM Local_Downloader_Services LDS
            JOIN Services_Users_Permissions SUP ON LDS.Service_ID = SUP.Service_ID
            JOIN Services S ON LDS.Service_ID = S.Service_ID
            WHERE (
                SELECT COUNT(1)
                FROM Services_Users_Permissions SUP
                WHERE LDS.Service_ID = SUP.Service_ID
                AND SUP.User_ID = ?
                AND SUP.Permission IN ${dbvariablelist(permissionsToCheck.length)}
            ) = ?
            AND LDS.Local_Downloader_Service_ID IN ${dbvariablelist(localDownloaderServiceIDs.length)}
        `, [
            user.id(),
            ...permissionsToCheck,
            permissionsToCheck.length,
            ...localDownloaderServiceIDs
        ]));
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]} permissionsToCheck 
     * @param {number} localDownloaderServiceID
     */
    static async userSelectByID(dbs, user, permissionsToCheck, localDownloaderServiceID) {
        return (await LocalDownloaderServices.userSelectManyByIDs(dbs, user, permissionsToCheck, [localDownloaderServiceID]))[0];
    }

    /**
     * @param {Databases} dbs
     * @param {User} user 
     * @param {=} permissionsToCheck
     */
    static async userSelectAll(dbs, user, permissionsToCheck) {
        return (await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            LocalDownloaderServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT LDS.Local_Downloader_Service_ID, SUP.Permission
                    FROM Local_Downloader_Services LDS
                    JOIN Services_Users_Permissions SUP ON LDS.Service_ID = SUP.Service_ID
                    WHERE SUP.User_ID = ?;
                `, [user.id()]);
            },
            "Local_Downloader_Service_ID",
            permissionsToCheck
        )).filter(localDownloaderService => localDownloaderService.Local_Downloader_Service_ID !== SYSTEM_LOCAL_DOWNLOADER_SERVICE.Local_Downloader_Service_ID);
    }

    /**
     * @param {Databases} dbs
     * @param {number} user
     * @param {string} serviceName
     */
    static async userInsert(dbs, userID, serviceName) {
        dbs = await dbBeginTransaction(dbs);

        const serviceID = await Services.insert(dbs, serviceName);
        await ServicesUsersPermissions.insertMany(dbs, serviceID, userID, Object.values(PERMISSIONS.LOCAL_METRIC_SERVICES).map(permission => permission.name));

        /** @type {number} */
        const localDownloaderServiceID = (await dbget(dbs, `
            INSERT INTO Local_Downloader_Services(
                Service_ID
            ) VALUES (
                ?
            ) RETURNING Local_Downloader_Service_ID;
        `, [serviceID])).Local_Downloader_Service_ID;
        
        await LocalTags.insertSystemTag(dbs, createFromLocalDownloaderServiceLookupName(localDownloaderServiceID));

        await dbEndTransaction(dbs);

        return localDownloaderServiceID;
    }

    /**
     * @param {Databases} dbs
     * @param {number} localDownloaderServiceID
     * @param {string} serviceName
     */
    static async update(dbs, localDownloaderServiceID, serviceName) {
        const localDownloaderService = await LocalDownloaderServices.selectByID(dbs, localDownloaderServiceID);
        await Services.update(dbs, localDownloaderService.Service_ID, serviceName);

        return localDownloaderServiceID;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localDownloaderServiceID 
     */
    static async deleteByID(dbs, localDownloaderServiceID) {
        dbs = await dbBeginTransaction(dbs);

        const localDownloaderService = await LocalDownloaderServices.selectByID(dbs, localDownloaderServiceID);

        await Services.deleteByID(dbs, localDownloaderService.Service_ID);
        await LocalURLParsers.deleteManyByIDs(dbs, localDownloaderService.Local_URL_Parsers.map(localURLParser => localURLParser.Local_URL_Parser_ID));
        await LocalTags.deleteSystemTag(dbs, createFromLocalDownloaderServiceLookupName(localDownloaderServiceID));
        await dbrun(dbs, "DELETE FROM Local_Downloader_Services WHERE Local_Downloader_Service_ID = ?;", [localDownloaderServiceID]);

        await dbEndTransaction(dbs);
    }
}