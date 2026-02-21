import { createFromLocalDownloaderLookupName, createFromLocalDownloaderServiceLookupName } from "../client/js/downloaders.js";
import { PERMISSIONS } from "../client/js/user.js";
import { dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun } from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js";
import { LocalTags } from "./tags.js";

/** @import {DBService} from "./services.js" */
/** @import {Databases} from "./db-util.js" */
/** @import {User} from "../client/js/user.js" */

/**
 * @typedef {Object} DBLocalDownloaderService
 * @property {number} Local_Downloader_Service_ID
 * @property {bigint} From_Local_LOCAL_DOWNLOADER_Tag_ID
 */

/**
 * @typedef {DBLocalDownloaderService & DBService} DBJoinedLocalDownloaderService
 */
/** @typedef {DBJoinedLocalDownloaderService & {Permissions: Set<string>}} DBPermissionedLocalDownloaderService */

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
     * @param {number[]} localDownloaderServiceIDs
     */
    static async selectManyByIDs(dbs, localDownloaderServiceIDs) {
        if (localDownloaderServiceIDs.length === 0) {
            return [];
        }

        /** @type {DBJoinedLocalDownloaderService[]} */
        const localDownloaderServices = await dballselect(dbs, `
            SELECT *
              FROM Local_Downloader_Services LUGS
              JOIN Services S ON LUGS.Service_ID = S.Service_ID
              WHERE LUGS.Local_Downloader_Service_ID IN ${dbvariablelist(localDownloaderServiceIDs.length)};`, localDownloaderServiceIDs
        );

        return localDownloaderServices;
    }

    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBJoinedLocalDownloaderService[]} */
        const localDownloaderServices = await dballselect(dbs, `
            SELECT *
              FROM Local_Downloader_Services LUGS
              JOIN Services S ON LUGS.Service_ID = S.Service_ID;
        `);
        return localDownloaderServices;
    }

    
    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {string[]} permissionsToCheck
     * @param {number[]} localDownloaderServiceIDs
     */
    static async userSelectManyByIDs(dbs, user, permissionsToCheck, localDownloaderServiceIDs) {
        if (localDownloaderServiceIDs.length === 0) {
            return [];
        }

        if (user.isSudo() || user.hasPermissions(permissionsToCheck)) {
            return await LocalDownloaderServices.selectManyByIDs(dbs, localDownloaderServiceIDs);
        }

        /** @type {DBJoinedLocalDownloaderService[]} */
        const localDownloaderServices = await dballselect(dbs, `
            SELECT LUGS.*, S.*
            FROM Local_Downloader_Services LUGS
            JOIN Services_Users_Permissions SUP ON LUGS.Service_ID = SUP.Service_ID
            JOIN Services S ON LUGS.Service_ID = S.Service_ID
            WHERE (
                SELECT COUNT(1)
                FROM Services_Users_Permissions SUP
                WHERE LMS.Service_ID = SUP.Service_ID
                AND SUP.User_ID = ?
                AND SUP.Permission IN ${dbvariablelist(permissionsToCheck.length)}
            ) = ?
            AND LUGS.Local_Downloader_Service_ID IN ${dbvariablelist(localDownloaderServiceIDs.length)};
        `, [
            user.id(),
            permissionsToCheck,
            permissionsToCheck.length,
            ...localDownloaderServiceIDs
        ]);

        return localDownloaderServices;
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
     * @param {string[]=} permissionsToCheck
     */
    static async userSelectAll(dbs, user, permissionsToCheck) {
        return await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            LocalDownloaderServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT LUGS.Local_Downloader_Service_ID, SUP.Permission
                      FROM Local_Downloader_Services LUGS
                      JOIN Services_Users_Permissions SUP ON LUGS.Service_ID = SUP.Service_ID
                     WHERE SUP.User_ID = ?;
                `, [user.id()]);
            },
            "Local_Downloader_Service_ID",
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
        await ServicesUsersPermissions.insertMany(dbs, serviceID, user.id(), Object.values(PERMISSIONS.LOCAL_DOWNLOADER_SERVICES).map(permission => permission.name));

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
    }
}

/**
 * @typedef {Object} PreInsertLocalDownloader
 * @property {string} Local_LOCAL_DOWNLOADER_Name
 * @property {string} Local_LOCAL_DOWNLOADER_JSON
 */

export class LocalDownloader {
    static async update(dbs, localDownloaderID, preInsertLocalDownloader) {
        await dbrun(dbs, `
            UPDATE Local_LOCAL_DOWNLOADERs
               SET Local_LOCAL_DOWNLOADER_Name = ?,
                   Local_LOCAL_DOWNLOADER_JSON = ?
             WHERE Local_LOCAL_DOWNLOADER_ID = ?;
        `, [
            preInsertLocalDownloader.Local_LOCAL_DOWNLOADER_Name,
            preInsertLocalDownloader.Local_LOCAL_DOWNLOADER_JSON,
            localDownloaderID
        ])
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalDownloader} preInsertLocalDownloader 
     * @param {number} localDownloaderServiceID 
     */
    static async insert(dbs, preInsertLocalDownloader, localDownloaderServiceID) {
        dbs = await dbBeginTransaction(dbs);

        /** @type {number} */
        const localDownloaderID = (await dbget(dbs, `
            INSERT INTO Local_LOCAL_DOWNLOADERs(
                Local_Downloader_Service_ID,
                Local_LOCAL_DOWNLOADER_Name,
                Local_LOCAL_DOWNLOADER_JSON
            ) VALUES (
                $localDownloaderServiceID,
                $localDownloaderName,
                $localDownloaderJSON
            ) RETURNING Local_LOCAL_DOWNLOADER_ID;
        `, [
            preInsertLocalDownloader.Local_LOCAL_DOWNLOADER_Name,
            preInsertLocalDownloader.Local_LOCAL_DOWNLOADER_JSON,
            localDownloaderServiceID,
        ])).Local_LOCAL_DOWNLOADER_ID;
        
        await LocalTags.insertSystemTag(dbs, createFromLocalDownloaderLookupName(localDownloaderID));

        await dbEndTransaction(dbs);
    }
}