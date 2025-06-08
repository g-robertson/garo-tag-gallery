import {dbGenerateAccessKey, dbsqlcommand} from "../../db/db-util.js"
import { DEFAULT_ADMINISTRATOR_PERMISSION_ID, DEFAULT_ADMINISTRATOR_USER_ID } from "../../db/user.js";
import { insertsystemtag } from "../../db/tags.js";
import { DEFAULT_LOCAL_TAG_SERVICE, HAS_NOTES_TAG, HAS_URL_TAG, IS_FILE_TAG, LAST_SYSTEM_TAG, SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { DEFAULT_LOCAL_TAGGABLE_SERVICE, IN_DEFAULT_LOCAL_TAGGABLE_SERVICE_TAG } from "../../client/js/taggables.js";

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
                Permission_Set_Name TEXT NOT NULL,

                User_Management_Permission INTEGER NOT NULL DEFAULT 0,
                Local_Taggable_Services_Permission INTEGER NOT NULL DEFAULT 0,
                Local_Taggable_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
                Global_Taggable_Services_Permission INTEGER NOT NULL DEFAULT 0,
                Global_Taggable_Services_Byte_Transfer_Limit INTEGER DEFAULT 0,
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
                Local_Taggable_Services_Permission,
                Local_Taggable_Services_Byte_Transfer_Limit,
                Global_Taggable_Services_Permission,
                Global_Taggable_Services_Byte_Transfer_Limit,
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
                14, /* Local_Taggable_Services_Permission */
                NULL,
                14, /* Global_Taggable_Services_Permission */
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
                Permission_Set_ID INTEGER NOT NULL,
                JSON_Pages TEXT NOT NULL DEFAULT '[]',
                JSON_Preferences TEXT NOT NULL DEFAULT '{}',
                User_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
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
                $systemLocalTagServiceID,
                $systemLocalTagServiceName
            ), (
                $defaultLocalTagServiceID,
                $defaultLocalTagServiceName
            ), (
                $reservedServiceID,
                'system:reserved:user should not see'
            );
        `, {
            $systemLocalTagServiceID: SYSTEM_LOCAL_TAG_SERVICE.Service_ID,
            $systemLocalTagServiceName: SYSTEM_LOCAL_TAG_SERVICE.Service_Name,
            $defaultLocalTagServiceID: DEFAULT_LOCAL_TAG_SERVICE.Service_ID,
            $defaultLocalTagServiceName: DEFAULT_LOCAL_TAG_SERVICE.Service_Name,
            $reservedServiceID: 0xFFFF
        }),
        dbsqlcommand(`
            INSERT INTO Local_Tag_Services(
                Local_Tag_Service_ID,
                Service_ID,
                User_Editable
            ) VALUES (
                $systemLocalTagLocalTagServiceID,
                $systemLocalTagServiceID,
                0
            ), (
                $defaultLocalTagLocalTagServiceID,
                $defaultLocalTagServiceID,
                1
            );
        `, {
            $systemLocalTagLocalTagServiceID: SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID,
            $systemLocalTagServiceID: SYSTEM_LOCAL_TAG_SERVICE.Service_ID,
            $defaultLocalTagLocalTagServiceID: DEFAULT_LOCAL_TAG_SERVICE.Local_Tag_Service_ID,
            $defaultLocalTagServiceID: DEFAULT_LOCAL_TAG_SERVICE.Service_ID,
        }),
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
        // used to reserve first 65535 tags for system usage
        ...insertsystemtag(LAST_SYSTEM_TAG),
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
            CREATE TABLE URLs(
                URL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                URL Text NOT NULL,
                Has_URL_Tag_ID INTEGER NOT NULL,
                URL_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
            );
        `),
        dbsqlcommand(`
            CREATE TABLE URL_Associations(
                URL_Association_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                URL_ID INTEGER NOT NULL,
                URL_Association TEXT,
                URL_Associations_PK_Hash TEXT NOT NULL,
                Has_URL_With_Association_Tag_ID INTEGER NOT NULL,
                URL_Association_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
            ); 
        `),
        ...insertsystemtag(HAS_URL_TAG),
        dbsqlcommand(`
            CREATE TABLE File_Extensions(
                File_Extension_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Has_File_Extension_Tag_ID INTEGER NOT NULL,
                File_Extension TEXT NOT NULL,
                File_Extension_Created_Date INTEGER NOT NULL DEFAULT (unixepoch('now'))
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Taggable_Services(
                Local_Taggable_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                In_Local_Taggable_Service_Tag_ID INTEGER NOT NULL
            );
        `),
        ...insertsystemtag(IN_DEFAULT_LOCAL_TAGGABLE_SERVICE_TAG),
        dbsqlcommand(`INSERT INTO Services(
                Service_ID,
                Service_Name
            ) VALUES (
                $defaultLocalTaggableServiceID,
                $defaultLocalTaggableServiceName
            );
        `, {$defaultLocalTaggableServiceID: DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_ID, $defaultLocalTaggableServiceName: DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_Name}),
        dbsqlcommand(`
            INSERT INTO Local_Taggable_Services(
                Local_Taggable_Service_ID,
                Service_ID,
                In_Local_Taggable_Service_Tag_ID
            ) VALUES (
                $defaultLocalTaggableLocalTaggableServiceID,
                $defaultLocalTaggableServiceID,
                $defaultLocalTaggableServiceTagID
            );
        `, {
            $defaultLocalTaggableLocalTaggableServiceID: DEFAULT_LOCAL_TAGGABLE_SERVICE.Local_Taggable_Service_ID,
            $defaultLocalTaggableServiceID: DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_ID,
            $defaultLocalTaggableServiceTagID: Number(IN_DEFAULT_LOCAL_TAGGABLE_SERVICE_TAG.Tag_ID)
        }),
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
        ...insertsystemtag(HAS_NOTES_TAG),
        dbsqlcommand(`
            CREATE TABLE Files(
                File_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                File_Hash BLOB NOT NULL,
                Has_File_Hash_Tag_ID INTEGER NOT NULL,
                File_Extension_ID INTEGER NOT NULL
            );
        `),
        ...insertsystemtag(IS_FILE_TAG),
        dbsqlcommand(`
            CREATE TABLE Local_Files(
                Local_File_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                File_ID INTEGER NOT NULL,
                Taggable_ID INTEGER NOT NULL
            );    
        `),
        dbsqlcommand(`
            CREATE TABLE Services_Users_Permissions(
                Service_User_Permission_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                User_ID INTEGER NOT NULL,
                Permission_Extent INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Metrics_Service(
                Local_Metric_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                Has_Metric_From_Local_Metric_Service_Tag_ID INTEGER NOT NULL,
                User_Editable INTEGER NOT NULL
            ); 
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Metrics(
                Local_Metric_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_Metric_Service_ID INTEGER NOT NULL,
                Has_Local_Metric_Tag_ID INTEGER NOT NULL,
                Local_Metric_Name TEXT NOT NULL,
                Local_Metric_Lower_Bound REAL,
                Local_Metric_Upper_Bound REAL,
                Local_Metric_Precision REAL NOT NULL,
                Local_Metric_Type INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Applied_Metrics(
                Local_Applied_Metric_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_Metric_ID INTEGER NOT NULL,
                User_ID INTEGER,
                Applied_Value REAL NOT NULL,
                Local_Applied_Metric_PK_Hash TEXT NOT NULL,
                Local_Applied_Metric_Tag_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Generator_Services(
                Local_URL_Generator_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                Has_URL_From_Local_URL_Generator_Service_Tag_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Generators(
                Local_URL_Generator_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_URL_Generator_Service_ID INTEGER NOT NULL,
                Has_URL_From_Local_URL_Generator_Tag_ID INTEGER NOT NULL,
                Local_URL_Generator_Name TEXT NOT NULL,
                LocaL_URL_Generator_JSON TEXT NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Classifier_Services(
                Local_URL_Classifier_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                Has_URL_From_Local_URL_Classifier_Service_Tag_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_URL_Classifiers(
                Local_URL_Classifier_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_URL_Classifier_Service_ID INTEGER NOT NULL,
                Has_URL_From_Local_URL_Classifier_Tag_ID INTEGER NOT NULL,
                Local_URL_Classifier_Name TEXT NOT NULL,
                LocaL_URL_Classifier_JSON TEXT NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Parser_Services(
                Local_Parser_Service_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Service_ID INTEGER NOT NULL,
                From_Local_Parser_Service_Tag_ID INTEGER NOT NULL
            );
        `),
        dbsqlcommand(`
            CREATE TABLE Local_Parsers(
                Local_Parser_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Local_Parser_Service_ID INTEGER NOT NULL,
                From_Local_Parser_Tag_ID INTEGER NOT NULL,
                Local_Parser_Name TEXT NOT NULL,
                LocaL_Parser_JSON TEXT NOT NULL
            );
        `)
    ]
};