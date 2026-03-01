import { createFromLocalURLParserLookupName } from "../client/js/parsers.js";
import { insertSystemTag, LocalTags } from "./tags.js";
import { dballselect, dbsqlcommand, dbvariablelist } from "./db-util.js";
import { SYSTEM_LOCAL_DOWNLOADER_SERVICE } from "../client/js/defaults.js";

/** @import {Databases} from "./db-util.js" */
/** @import {DBLocalTag} from "./tags.js" */


/**
 * @param {TagMappedDBLocalURLParser} systemURLParser
 */
export function insertSystemURLParser(systemURLParser) {
    return [
        ...insertSystemTag(systemURLParser.From_Local_URL_Parser_Tag),
        dbsqlcommand(`
            INSERT INTO Local_URL_Parsers(
                Local_URL_Parser_ID,
                Local_Downloader_Service_ID,
                Local_URL_Parser_Name,
                Local_URL_Parser_URL_Classifier_JSON,
                Local_URL_Parser_Content_Parser_JSON,
                Local_URL_Parser_Priority
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            );
        `, [
            systemURLParser.Local_URL_Parser_ID,
            SYSTEM_LOCAL_DOWNLOADER_SERVICE.Local_Downloader_Service_ID,
            systemURLParser.Local_URL_Parser_Name,
            JSON.stringify(systemURLParser.Local_URL_Parser_URL_Classifier_JSON, undefined, 0),
            JSON.stringify(systemURLParser.Local_URL_Parser_Content_Parser_JSON, undefined, 0),
            systemURLParser.Local_URL_Parser_Priority
        ])
    ];
}

/**
 * @typedef {Object} PreInsertLocalURLParser
 * @property {string} Local_URL_Parser_Name
 * @property {number} Local_URL_Parser_URL_Classifier_JSON
 * @property {number} Local_URL_Parser_Content_Parser_JSON
 * @property {number} Local_URL_Parser_Priority
 * 
 * @typedef {PreInsertLocalURLParser & { Local_URL_Parser_ID: number, Local_Downloader_Service_ID: number }} DBLocalURLParser
 */

/**
 * @typedef {DBLocalURLParser & {
 *     From_Local_URL_Parser_Tag: DBLocalTag
 * }} TagMappedDBLocalURLParser
 */

export class LocalURLParsers {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localURLParserIDs 
     */
    static async selectTagMappings(dbs, localURLParserIDs) {
        return await LocalTags.selectManySystemTagsByLookupNames(dbs, localURLParserIDs.map(createFromLocalURLParserLookupName));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} localURLParserID
     */
    static async selectTagMapping(dbs, localURLParserID) {
        return (await LocalURLParsers.selectTagMappings(dbs, [localURLParserID]))[0]
    }

    /**
     * @param {Databases} dbs 
     * @param {DBLocalURLParser[]} localURLParsers 
     */
    static async tagMapped(dbs, localURLParsers) {
        const tagMappings = await LocalURLParsers.selectTagMappings(dbs, localURLParsers.map(localURLParser => localURLParser.Local_URL_Parser_ID));
        return localURLParsers.map((localURLParser, i) => ({
            ...localURLParser,
            From_Local_URL_Parser_Tag: tagMappings[i]
        }));
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localURLParserIDs 
     */
    static async selectManyByIDs(dbs, localURLParserIDs) {
        if (localURLParserIDs.length === 0) {
            return [];
        }

        /** @type {DBLocalURLParser[]} */
        const dbLocalURLParsers = await dballselect(dbs, `
            SELECT *
            FROM Local_URL_Parsers
            WHERE Local_URL_Parser_ID IN ${dbvariablelist(localURLParserIDs.length)};
            `, localURLParserIDs
        );

        return dbLocalURLParsers;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localURLParserID 
     */
    static async selectByID(dbs, localURLParserID) {
        return (await LocalURLParsers.selectManyByIDs(dbs, [localURLParserID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localDownloaderServiceIDs
     */
    static async selectManyByLocalDownloaderServiceIDs(dbs, localDownloaderServiceIDs) {
        if (localDownloaderServiceIDs.length === 0) {
            return [];
        }

        /** @type {DBLocalURLParser[]} */
        const dbLocalURLParsers = await dballselect(dbs, `
            SELECT *
            FROM Local_URL_Parsers
            WHERE Local_Downloader_Service_ID IN ${dbvariablelist(localDownloaderServiceIDs.length)};
            `, localDownloaderServiceIDs
        );

        return dbLocalURLParsers;
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertLocalURLParser} preInsertLocalURLParser
     * @param {number} localDownloaderServiceID
     */
    static async insert(dbs, preInsertLocalURLParser, localDownloaderServiceID) {
        dbs = await dbBeginTransaction(dbs);

        const localURLParserID = (await dbget(dbs, `
            INSERT INTO Local_URL_Parsers(
                Local_Downloader_Service_ID,
                Local_URL_Parser_Name,
                Local_URL_Parser_URL_Classifier_JSON,
                Local_URL_Parser_Content_Parser_JSON,
                Local_URL_Parser_Priority
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                ?
            ) RETURNING Local_URL_Parser_ID;
        `, [
            localDownloaderServiceID,
            preInsertLocalURLParser.Local_URL_Parser_Name,
            JSON.stringify(preInsertLocalURLParser.Local_URL_Parser_URL_Classifier_JSON, undefined, 0),
            JSON.stringify(preInsertLocalURLParser.Local_URL_Parser_Content_Parser_JSON, undefined, 0),
            preInsertLocalURLParser.Local_URL_Parser_Priority
        ])).Local_URL_Parser_ID;

        await LocalTags.insertSystemTag(dbs, createFromLocalURLParserLookupName(localURLParserID));

        await dbEndTransaction(dbs);

        return localURLParserID;
    }

    
    /**
     * @param {Databases} dbs
     * @param {number} localURLParserID
     * @param {PreInsertLocalURLParser} preInsertLocalURLParser
     */
    static async update(dbs, localURLParserID, preInsertLocalURLParser) {
        await dbrun(dbs, `
            UPDATE Local_URL_Parsers
            SET Local_URL_Parser_Name = ?,
                Local_URL_Parser_URL_Classifier_JSON = ?,
                Local_URL_Parser_Content_Parser_JSON = ?,
                Local_URL_Parser_Priority = ?
            WHERE Local_URL_Parser_ID = ?;
        `, [
            preInsertLocalURLParser.Local_URL_Parser_Name,
            JSON.stringify(preInsertLocalURLParser.Local_URL_Parser_URL_Classifier_JSON, undefined, 0),
            JSON.stringify(preInsertLocalURLParser.Local_URL_Parser_Content_Parser_JSON, undefined, 0),
            preInsertLocalURLParser.Local_URL_Parser_Priority,
            localURLParserID
        ]);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localURLParserIDs 
     */
    static async deleteManyByIDs(dbs, localURLParserIDs) {
        if (localURLParserIDs.length === 0) {
            return;
        }

        dbs = await dbBeginTransaction(dbs);

        await AppliedMetrics.deleteManyByLocalURLParserIDs(dbs, localURLParserIDs);
        await LocalTags.deleteManySystemTags(dbs, localURLParserIDs.map(createFromLocalURLParserLookupName));
        await dbrun(dbs, `DELETE FROM Local_URL_Parsers WHERE Local_URL_Parser_ID IN ${dbvariablelist(localURLParserIDs.length)}`, localURLParserIDs);

        await dbEndTransaction(dbs);
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localURLParserID  
     */
    static async deleteByID(dbs, localURLParserID) {
        return await LocalURLParsers.deleteManyByIDs(dbs, [localURLParserID]);
    }
};