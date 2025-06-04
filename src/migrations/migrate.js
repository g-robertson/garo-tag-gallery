import sqlite3 from "sqlite3";
import { dbrun, dball, dbGenerateAccessKey, dbsqlcommand } from "../db/db-util.js";
import { DEFAULT_ADMINISTRATOR_PERMISSION_ID, DEFAULT_ADMINISTRATOR_USER_ID } from "../db/user.js";

/**
 * @import {Databases} from "../db/db-util.js"
 */

/**
 * 
 * @param {Databases} dbs
 */
export default async function migrate(dbs) {
    await dbrun(dbs, `
    CREATE TABLE IF NOT EXISTS Migrations_Applied(
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT UNIQUE,
        Applied_Date INTEGER
    );`);

    const migrationNames = new Set((await dball(dbs, "SELECT Name FROM Migrations_Applied;")).rows.map(row => row['Name']));
    const accessKey = dbGenerateAccessKey();
    const migrations = [{
        name: "Initialize database",
        commands: [
            /*
                Permission is an bitset integer that determines CREATE/READ/UPDATE/DELETE permissions for every service for a user with that permission set
                {create (8|0) }{read (4|0) }{update (2|0) }{delete (1|0) }
            */
            dbsqlcommand(`
                CREATE TABLE Permission_Sets(
                    Permission_Set_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Permission_Set_Name TEXT NOT NULL,

                    User_Management_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_File_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_File_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_File_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_File_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Local_Rating_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_Rating_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_Rating_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_Rating_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Local_Tag_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_Tag_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_Tag_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_Tag_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Local_Tag_Relations_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_Tag_Relations_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_Tag_Relations_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_Tag_Relations_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Local_URL_Generator_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_URL_Generator_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_URL_Generator_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_URL_Generator_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Local_URL_Classifier_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_URL_Classifier_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_URL_Classifier_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_URL_Classifier_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Local_Parser_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Local_Parser_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                    Global_Parser_Services_Permission INTEGER NOT NULL DEFAULT 0,
                    Global_Parser_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,

                    Settings_Permission INTEGER NOT NULL DEFAULT 0,
                    Advanced_Settings_Permission INTEGER NOT NULL DEFAULT 0
                );
            `),
            dbsqlcommand(`
                INSERT INTO Permission_Sets(
                    Permission_Set_ID,
                    Permission_Set_Name,
                    User_Management_Permission,
                    Local_File_Services_Permission,
                    Local_File_Services_Byte_Transfer_Limit,
                    Global_File_Services_Permission,
                    Global_File_Services_Byte_Transfer_Limit,
                    Local_Rating_Services_Permission,
                    Local_Rating_Services_Byte_Transfer_Limit,
                    Global_Rating_Services_Permission,
                    Global_Rating_Services_Byte_Transfer_Limit,
                    Local_Tag_Services_Permission,
                    Local_Tag_Services_Byte_Transfer_Limit,
                    Global_Tag_Services_Permission,
                    Global_Tag_Services_Byte_Transfer_Limit,
                    Local_Tag_Relations_Services_Permission,
                    Local_Tag_Relations_Services_Byte_Transfer_Limit,
                    Global_Tag_Relations_Services_Permission,
                    Global_Tag_Relations_Services_Byte_Transfer_Limit,
                    Local_URL_Generator_Services_Permission,
                    Local_URL_Generator_Services_Byte_Transfer_Limit,
                    Global_URL_Generator_Services_Permission,
                    Global_URL_Generator_Services_Byte_Transfer_Limit,
                    Local_URL_Classifier_Services_Permission,
                    Local_URL_Classifier_Services_Byte_Transfer_Limit,
                    Global_URL_Classifier_Services_Permission,
                    Global_URL_Classifier_Services_Byte_Transfer_Limit,
                    Local_Parser_Services_Permission,
                    Local_Parser_Services_Byte_Transfer_Limit,
                    Global_Parser_Services_Permission,
                    Global_Parser_Services_Byte_Transfer_Limit,
                    Settings_Permission,
                    Advanced_Settings_Permission
                ) VALUES (
                    $defaultAdminPermissionId, /* ID */
                    'Default Administrator Permission Set',
                    4, /* User_Management_Permission */
                    14, /* Local_File_Services_Permission */
                    NULL,
                    14, /* Global_File_Services_Permission */
                    NULL,
                    14, /* Local_Rating_Services_Permission */
                    NULL,
                    14, /* Global_Rating_Services_Permission */
                    NULL,
                    14, /* Local_Tag_Services_Permission */
                    NULL,
                    14, /* Global_Tag_Services_Permission, */
                    NULL,
                    14, /* Local_Tag_Relations_Services_Permission */
                    NULL,
                    14, /* Global_Tag_Relations_Services_Permission */
                    NULL,
                    14, /* Local_URL_Generator_Services_Permission */
                    NULL,
                    14, /* Global_URL_Generator_Services_Permission */
                    NULL,
                    14, /* Local_URL_Classifier_Services_Permission */
                    NULL,
                    14, /* Global_URL_Classifier_Services_Permission */
                    NULL,
                    14, /* Local_Parser_Services_Permission */
                    NULL,
                    14, /* Global_Parser_Services_Permission */
                    NULL,
                    6, /* Settings_Permission */
                    4 /* Advanced_Settings_Permission */
                );
                `,
                {
                    $defaultAdminPermissionId: DEFAULT_ADMINISTRATOR_PERMISSION_ID
                }
            ),
            dbsqlcommand(`
                CREATE TABLE Users(
                    User_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    User_Name TEXT NOT NULL UNIQUE,
                    Is_Administrator INTEGER NOT NULL DEFAULT FALSE,
                    Access_Key TEXT NOT NULL UNIQUE,
                    Permission_Set_ID INTEGERNOT NULL ,
                    Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
                );
            `),
            dbsqlcommand(`
                INSERT INTO Users(
                    User_ID,
                    User_Name,
                    Is_Administrator,
                    Access_Key,
                    Permission_Set_ID
                ) VALUES (
                    $defaultAdminUserId,
                    'Admin',
                    TRUE,
                    $accessKey,
                    $defaultAdminPermissionId
                );
                `,
                {
                    $accessKey: accessKey,
                    $defaultAdminUserId: DEFAULT_ADMINISTRATOR_USER_ID,
                    $defaultAdminPermissionId: DEFAULT_ADMINISTRATOR_PERMISSION_ID
                }
            ),
            dbsqlcommand(`
                CREATE TABLE Services(
                    Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Service_Name TEXT
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Services_Permissions(
                    Service_ID INTEGER NOT NULL,
                    User_ID INTEGER NOT NULL,
                    Permission_Extent INTEGER NOT NULL DEFAULT 0
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Tags(
                    Tag_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Source_Name TEXT DEFAULT 'System generated',
                    Tag_Name TEXT NOT NULL
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Namespaces(
                    Namespace_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Namespace_Name TEXT NOT NULL UNIQUE
                ); 
            `),
            dbsqlcommand(`
                CREATE TABLE Tags_Namespaces(
                    Tag_ID INTEGER NOT NULL,
                    Namespace_ID INTEGER NOT NULL
                ); 
            `),
            dbsqlcommand(`
                CREATE TABLE Tag_Services(
                    Tag_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Service_ID INTEGER NOT NULL
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Tag_Services_Tags(
                    Tag_Service_ID INTEGER NOT NULL,
                    Tag_ID INTEGER NOT NULL
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Local_Tag_Services(
                    Local_Tag_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Tag_Service_ID INTEGER NOT NULL
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Taggables(
                    Taggable_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Taggable_Name TEXT,
                    Last_Viewed_Date INTEGER,
                    Last_Modified_Date INTEGER NOT NULL DEFAULT (unixepoch('now')),
                    Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now')),
                    Deleted_Date INTEGER
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Files(
                    File_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Taggable_ID INTEGER NOT NULL,
                    File_Hash BLOB,
                    File_Type TEXT
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Taggable_Services(
                    Taggable_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Service_ID INTEGER NOT NULL
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Taggable_Services_Taggables(
                    Taggable_Service_ID INTEGER NOT NULL,
                    Taggable_ID INTEGER NOT NULL
                );
            `),
            dbsqlcommand(`
                CREATE TABLE Local_Taggable_Services(
                    Local_Taggable_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Taggable_Service_ID INTEGER NOT NULL
                );
            `)
        ]
    }];
    for (const migration of migrations) {
        if (migrationNames.has(migration.name)) {
            continue;
        }

        await dbrun(dbs, "BEGIN TRANSACTION;");
        for (let command of migration.commands) {
            if (typeof command === "string") {
                command = {sql: command};
            }
            
            const err = await dbrun(dbs, command.sql, command.params);
            if (err) {
                throw `Error while migrating database: ${err.message}`;
            }
        }
        await dbrun(dbs, "INSERT INTO Migrations_Applied(Name, Applied_Date) VALUES (?, unixepoch('now'));", migration.name);
        await dbrun(dbs, "COMMIT;");
    }
}