import {dbGenerateAccessKey, dbsqlcommand} from "../../db/db-util.js"
import { DEFAULT_ADMINISTRATOR_PERMISSION_ID, DEFAULT_ADMINISTRATOR_USER_ID } from "../../db/user.js";
import { insertSystemTag } from "../../db/tags.js";
import { DEFAULT_LOCAL_TAG_SERVICE, DEFAULT_LOCAL_TAGGABLE_SERVICE, SYSTEM_LOCAL_TAG_SERVICE, DEFAULT_TAGS, DEFAULT_LOCAL_METRICS } from "../../client/js/defaults.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { insertSystemMetric } from "../../db/metrics.js";

const accessKey = dbGenerateAccessKey();

export const MIGRATION = {
    name: "Initialize database",
    commands: [
        /*
            Permission is an bitset integer that determines CREATE/READ/UPDATE/DELETE permissions for every service for a user with that permission set
            {create (8|0) }{read (4|0) }{update (2|0) }{delete (1|0) }
        */
        dbsqlcommand(`
            CREATE TABLE Permission_Sets(
                Permission_Set_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Permission_Set_Name TEXT NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Permission_Sets_Permissions(
                Permission_Sets_Permissions_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Permission_Set_ID INTEGER NOT NULL,
                Permission TEXT NOT NULL
            ); 
        `),
        dbsqlcommand(`
            INSERT INTO Permission_Sets(
                Permission_Set_ID,
                Permission_Set_Name
            ) VALUES (
                ?,
                'Default Administrator Permission Set'
            );
            `, [DEFAULT_ADMINISTRATOR_PERMISSION_ID]
        ),
        ...[
            ...Object.values(PERMISSIONS.ADMINISTRATIVE),
            ...Object.values(PERMISSIONS.LOCAL_TAG_SERVICES),
            ...Object.values(PERMISSIONS.LOCAL_TAGGABLE_SERVICES),
            ...Object.values(PERMISSIONS.LOCAL_METRIC_SERVICES),
            ...Object.values(PERMISSIONS.LOCAL_URL_GENERATOR_SERVICES),
        ].map(permission => dbsqlcommand(`
                INSERT INTO Permission_Sets_Permissions(
                    Permission_Set_ID,
                    Permission
                ) VALUES (
                    ?,
                    ?
                );
            `,
            [
                DEFAULT_ADMINISTRATOR_PERMISSION_ID,
                permission.name
            ]
        )),
        dbsqlcommand(`
            CREATE TABLE Users(
                User_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                User_Name TEXT NOT NULL UNIQUE,
                Is_Administrator INTEGER NOT NULL DEFAULT FALSE,
                Access_Key TEXT NOT NULL UNIQUE,
                Permission_Set_ID INTEGER NOT NULL,
                JSON_Pages TEXT NOT NULL DEFAULT '[]',
                JSON_Preferences TEXT NOT NULL DEFAULT '{}',
                User_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
            );
        `),
        dbsqlcommand(`
            INSERT INTO Users(
                User_Name,
                Is_Administrator,
                User_ID,
                Permission_Set_ID,
                Access_Key
            ) VALUES (
                'Admin',
                TRUE,
                ?,
                ?,
                ?
            );
            `,
            [
                DEFAULT_ADMINISTRATOR_USER_ID,
                DEFAULT_ADMINISTRATOR_PERMISSION_ID,
                accessKey
            ]
        ),
        dbsqlcommand(`
            CREATE TABLE Services(
                Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_Name TEXT
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Tag_Services(
                Local_Tag_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                User_Editable INTEGER NOT NULL DEFAULT 1
            );
        `),
        dbsqlcommand(`
            INSERT INTO Services(
                Service_ID,
                Service_Name
            ) VALUES (
                ?,
                ?
            ), (
                ?,
                ?
            ), (
                ?,
                'system:reserved:user should not see'
            );
        `, [
            SYSTEM_LOCAL_TAG_SERVICE.Service_ID,
            SYSTEM_LOCAL_TAG_SERVICE.Service_Name,
            DEFAULT_LOCAL_TAG_SERVICE.Service_ID,
            DEFAULT_LOCAL_TAG_SERVICE.Service_Name,
            0xFFFF
        ]),
        dbsqlcommand(`
            INSERT INTO Local_Tag_Services(
                Local_Tag_Service_ID,
                Service_ID,
                User_Editable
            ) VALUES (
                ?,
                ?,
                0
            ), (
                ?,
                ?,
                1
            );
        `, [
            SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID,
            SYSTEM_LOCAL_TAG_SERVICE.Service_ID,
            DEFAULT_LOCAL_TAG_SERVICE.Local_Tag_Service_ID,
            DEFAULT_LOCAL_TAG_SERVICE.Service_ID,
    ]),
        dbsqlcommand(`
            CREATE TABLE Tags(
                Tag_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Tag_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Tags(
                Local_Tag_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Tag_ID INTEGER NOT NULL,
                Local_Tag_Service_ID INTEGER NOT NULL,
                Lookup_Name TEXT NOT NULL,
                Source_Name TEXT NOT NULL,
                Local_Tags_PK_Hash TEXT NOT NULL,
                Display_Name TEXT NOT NULL
            );
        `),
        ...DEFAULT_TAGS.map(insertSystemTag).flat(),
        dbsqlcommand(`
            CREATE TABLE Namespaces(
                Namespace_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Namespace_Name TEXT NOT NULL UNIQUE,
                Namespace_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
            ); 
        `),
        dbsqlcommand(`
            CREATE TABLE Tags_Namespaces(
                Tags_Namespaces_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Tag_ID INTEGER NOT NULL,
                Namespace_ID INTEGER NOT NULL,
                Tags_Namespaces_PK_Hash TEXT NOT NULL
            ); 
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Taggable_Services(
                Local_Taggable_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`INSERT INTO Services(
                Service_ID,
                Service_Name
            ) VALUES (
                ?,
                ?
            );
        `, [DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_ID, DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_Name]),
        dbsqlcommand(`
            INSERT INTO Local_Taggable_Services(
                Local_Taggable_Service_ID,
                Service_ID
            ) VALUES (
                ?,
                ?
            );
        `, [DEFAULT_LOCAL_TAGGABLE_SERVICE.Local_Taggable_Service_ID, DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_ID]),
        dbsqlcommand(`
            CREATE TABLE Taggables(
                Taggable_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Taggable_Name TEXT,
                Taggable_Last_Viewed_Date INTEGER,
                Taggable_Last_Modified_Date INTEGER NOT NULL DEFAULT (unixepoch('now')),
                Taggable_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now')),
                Taggable_Deleted_Date INTEGER
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Taggable_Notes(
                Taggable_Note_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Taggable_ID INTEGER NOT NULL,
                Note_Association TEXT,
                Note TEXT NOT NULL,
                Taggable_Note_Last_Viewed_Date INTEGER,
                Taggable_Note_Last_Modified_Date INTEGER NOT NULL DEFAULT (unixepoch('now')),
                Taggable_Note_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now')),
                Taggable_Note_Deleted_Date INTEGER
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Files(
                File_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                File_Hash BLOB NOT NULL,
                Perceptual_Hash BLOB,
                Perceptual_Hash_Version INTEGER,
                Exact_Bitmap_Hash BLOB,
                Prethumbnail_Hash BLOB,
                Thumbnail_Hash BLOB,
                File_Extension TEXT,

                File_Size INTEGER NOT NULL,
                Video_Size INTEGER NOT NULL,
                Frame_Count INTEGER NOT NULL,
                Width INTEGER,
                Height INTEGER,
                Duration REAL,
                Audio_Size INTEGER NOT NULL,
                Audio_Dimensions INTEGER,
                Audio_Sample_Rate INTEGER,

                Has_Transparency INTEGER NOT NULL,
                Has_Metadata INTEGER NOT NULL,
                Has_ICC_Profile INTEGER NOT NULL,
                Has_EXIF INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE File_Comparisons_Made(
                File_Comparisons_Made_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                File_Comparisons_Made_PK_Hash TEXT NOT NULL,
                File_ID_1 INTEGER NOT NULL,
                File_ID_2 INTEGER NOT NULL,
                Perceptual_Hash_Distance INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Taggable_Files(
                Taggable_File_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                File_ID INTEGER NOT NULL,
                Taggable_ID INTEGER NOT NULL
            );    
        `),
        dbsqlcommand(`
            CREATE TABLE Transitive_File_Relation_Groups(
                Transitive_File_Relation_Groups_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                File_Relation_Type INTEGER NOT NULL
            ); 
        `),
        dbsqlcommand(`
            CREATE TABLE Transitive_File_Relation_Groups_Files(
                Transitive_File_Relation_Groups_ID INTEGER NOT NULL,
                File_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Nontransitive_File_Relations(
                Nontransitive_File_Relations_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Nontransitive_File_Relations_PK_Hash TEXT NOT NULL,
                File_Relation_Type INTEGER NOT NULL,
                File_ID_1 INTEGER NOT NULL,
                File_ID_2 INTEGER NOT NULL
            ); 
        `),
        dbsqlcommand(`
            CREATE TABLE Better_Duplicate_File_Relations(
                Better_Duplicate_File_Relations_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Better_Duplicate_File_Relations_PK_Hash TEXT NOT NULL,
                Better_File_ID INTEGER NOT NULL,
                Worse_File_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Services_Users_Permissions(
                Service_User_Permission_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                User_ID INTEGER NOT NULL,
                Permission TEXT NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Metric_Services(
                Local_Metric_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                User_Editable INTEGER NOT NULL
            ); 
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Metrics(
                Local_Metric_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_Metric_Service_ID INTEGER NOT NULL,
                Local_Metric_Name TEXT NOT NULL,
                Local_Metric_Lower_Bound REAL,
                Local_Metric_Upper_Bound REAL,
                Local_Metric_Precision INTEGER NOT NULL,
                Local_Metric_Type INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Applied_Metrics(
                Local_Applied_Metric_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_Applied_Metric_PK_Hash TEXT NOT NULL,
                Local_Metric_ID INTEGER NOT NULL,
                User_ID INTEGER,
                Applied_Value REAL NOT NULL
            );
        `),
        ...DEFAULT_LOCAL_METRICS.map(insertSystemMetric).flat(),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Generator_Services(
                Local_URL_Generator_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Generators(
                Local_URL_Generator_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_URL_Generator_Service_ID INTEGER NOT NULL,
                Local_URL_Generator_Name TEXT NOT NULL,
                LocaL_URL_Generator_JSON TEXT NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Classifier_Services(
                Local_URL_Classifier_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Classifiers(
                Local_URL_Classifier_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_URL_Classifier_Service_ID INTEGER NOT NULL,
                Local_URL_Classifier_Name TEXT NOT NULL,
                LocaL_URL_Classifier_JSON TEXT NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Parser_Services(
                Local_Parser_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Parsers(
                Local_Parser_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_Parser_Service_ID INTEGER NOT NULL,
                Local_Parser_Name TEXT NOT NULL,
                LocaL_Parser_JSON TEXT NOT NULL
            );
        `)
    ]
};