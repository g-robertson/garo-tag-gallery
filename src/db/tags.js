import { HAS_URL_TAG, SYSTEM_LOCAL_TAG_SERVICE, localTagsPKHash, normalPreInsertLocalTag } from "../client/js/tags.js";
import { PERMISSIONS, User } from "../client/js/user.js";
import {asyncDataSlicer, dball, dballselect, dbBeginTransaction, dbEndTransaction, dbrun, dbsqlcommand, dbtuples, dbvariablelist} from "./db-util.js";
import { userSelectAllSpecificTypedServicesHelper } from "./services.js";

/** @import {DBService} from "./services.js" */
/** @import {PermissionInt} from "../client/js/user.js" */
/** @import {Databases} from "./db-util.js" */

/**
 * @param {PreInsertLocalTag & {Tag_ID: bigint}} systemTag 
 */
export function insertsystemtag(systemTag) {
    return [
        dbsqlcommand(`
            INSERT INTO Tags(
                Tag_ID
            ) VALUES (
                $systemTagID
            );
        `, {
            $systemTagID: Number(systemTag.Tag_ID),
        }),
        dbsqlcommand(`
            INSERT INTO Local_Tags(
                Tag_ID,
                Local_Tag_Service_ID,
                Lookup_Name,
                Source_Name,
                Local_Tags_PK_Hash,
                Display_Name
            ) VALUES (
                $systemTagID,
                $systemLocalTagServiceID,
                $systemTagLookupName,
                $systemTagSourceName,
                $systemTagPKHash,
                $systemTagDisplayName
            );
        `, {
            $systemTagID: Number(systemTag.Tag_ID),
            $systemLocalTagServiceID: SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID,
            $systemTagLookupName: systemTag.Lookup_Name,
            $systemTagSourceName: systemTag.Source_Name,
            $systemTagPKHash: localTagsPKHash(systemTag.Lookup_Name, systemTag.Source_Name),
            $systemTagDisplayName: systemTag.Display_Name,
        })
    ];
}

/**
 * @typedef {Object} DBLocalTagService
 * @property {number} Local_Tag_Service_ID
 * @property {number} Tag_Service_ID
 * @property {number} User_Editable
 */

/**
 * @typedef {DBLocalTagService & DBService} DBJoinedLocalTagService
 */
/** @typedef {DBJoinedLocalTagService & {Permission_Extent: PermissionInt}} DBPermissionedLocalTagService */

export class LocalTagServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagIDs
     * @returns {Promise<DBJoinedLocalTagService[]>}
     */
    static async selectManyByLocalTagIDs(dbs, localTagIDs) {
        return (await dballselect(dbs, `
            SELECT DISTINCT LTS.*, S.*
              FROM Local_Tag_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID
              JOIN Local_Tags LT ON LTS.Local_Tag_Service_ID = LT.Local_Tag_Service_ID
              WHERE LT.Local_Tag_ID IN ${dbvariablelist(localTagIDs.length)}
            `, localTagIDs
        ));
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagServiceID 
     * @returns {Promise<DBJoinedLocalTagService[]>}
     */
    static async selectManyByIDs(dbs, localTagServiceIDs) {
        return await dballselect(dbs, `
            SELECT *
              FROM Local_Tag_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID
              WHERE LTS.Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)};
            `, localTagServiceIDs
        );
    }
     
    /**
     * @param {Databases} dbs 
     * @param {number} localTagServiceID 
     */
    static async selectByID(dbs, localTagServiceID) {
        return (await LocalTagServices.selectManyByIDs(dbs, [localTagServiceID]))[0];
    }
    
    /**
     * @param {Databases} dbs 
     * @returns {Promise<DBJoinedLocalTagService[]>}
     */
    static async selectAll(dbs) {
        return await dballselect(dbs, `
            SELECT *
              FROM Local_Tag_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID;
        `);
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {PermissionInt} permissionBitsToCheck
     * @param {number[]} localTagServiceIDs
     * @returns {Promise<DBPermissionedLocalTagService[]>}
     */
    static async userSelectManyByIDs(dbs, user, permissionBitsToCheck, localTagServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionBitsToCheck, PERMISSIONS.LOCAL_TAG_SERVICES)) {
            return await LocalTagServices.selectManyByIDs(dbs, localTagServiceIDs);
        }

        return await dballselect(dbs, `
            SELECT LTS.*, S.*, SUP.Permission_Extent
              FROM Local_Tag_Services LTS
              JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
              JOIN Services S ON LTS.Service_ID = S.Service_ID
             WHERE SUP.User_ID = ?
               AND (SUP.Permission_Extent & ?) = ?
               AND LTS.Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)};
        `, [
            user.id(),
            permissionBitsToCheck,
            permissionBitsToCheck,
            ...localTagServiceIDs
        ]);
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {PermissionInt} permissionBitsToCheck 
     * @param {number} localTagServiceID 
     */
    static async userSelectByID(dbs, user, permissionBitsToCheck, localTagServiceID) {
        return (await LocalTagServices.userSelectManyByIDs(dbs, user, permissionBitsToCheck, [localTagServiceID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {PermissionInt} permissionBitsToCheck 
     */
    static async userSelectAll(dbs, user, permissionBitsToCheck) {
        const userSelectedPermissionedLocalTagServices = await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            PERMISSIONS.LOCAL_TAG_SERVICES,
            LocalTagServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT SUP.Permission_Extent, LTS.*, S.*
                      FROM Local_Tag_Services LTS
                      JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
                      JOIN Services S ON LTS.Service_ID = S.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()});
            },
            "Local_Tag_Service_ID",
            permissionBitsToCheck
        );

        return userSelectedPermissionedLocalTagServices.filter(dbLocalTagService => dbLocalTagService.User_Editable !== 0);
    }
}

/**
 * @typedef {Object} UserFacingLocalTag
 * @property {number} Local_Tag_ID
 * @property {number} Local_Tag_Service_ID
 * @property {bigint} Tag_ID
 * @property {string} Display_Name
 * @property {string} Tag_Name
 * @property {string[]} Namespaces
 */

/**
 * @param {Databases} dbs
 * @param {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} dbUserFacingLocalTags
 */
async function mapUserFacingLocalTags(dbs, dbUserFacingLocalTags) {
    dbUserFacingLocalTags = dbUserFacingLocalTags.map(dbUserFacingLocalTag => ({
        ...dbUserFacingLocalTag,
        Tag_Name: dbUserFacingLocalTag.Display_Name,
        Tag_ID: BigInt(dbUserFacingLocalTag.Tag_ID)
    }));

    /** @type {Map<bigint, string[]} */
    const tagsNamespaces = new Map(dbUserFacingLocalTags.map(dbUserFacingLocalTag => [dbUserFacingLocalTag.Tag_ID, []]));
    for (const {Tag_ID, Namespace_Name} of await TagsNamespaces.selectManyMappedByTagIDs(dbs, dbUserFacingLocalTags.map(tag => tag.Tag_ID))) {
        tagsNamespaces.get(Tag_ID).push(Namespace_Name);
    }

    const {tagsTaggableCounts} = await dbs.perfTags.readTagsTaggableCounts(dbUserFacingLocalTags.map(dbUserFacingLocalTag => dbUserFacingLocalTag.Tag_ID));

    return dbUserFacingLocalTags.map(dbUserFacingLocalTag => {
        let {Display_Name} = dbUserFacingLocalTag;
        const Namespaces = tagsNamespaces.get(dbUserFacingLocalTag.Tag_ID);
        if (Namespaces.length === 1) {
            Display_Name = `${Namespaces[0]}:${Display_Name}`;
        } else if (Namespaces.length > 1) {
            Display_Name = `multi-namespaced:${Display_Name}`;
        }

        return {
            ...dbUserFacingLocalTag,
            Namespaces,
            Display_Name,
            Tag_Count: tagsTaggableCounts.get(dbUserFacingLocalTag.Tag_ID)
        }
    });
}

export class UserFacingLocalTags {
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {number[]} localTagServiceIDs 
     */
    static async selectMappedByTaggableIDs(dbs, taggableIDs, localTagServiceIDs) {
        /** @type {Map<bigint, UserFacingLocalTag[]>} */
        const taggablesUserFacingLocalTags = new Map();
        if (localTagServiceIDs.length === 0) {
            return taggablesUserFacingLocalTags;
        }
        const {taggablePairings} = await dbs.perfTags.readTaggablesTags(taggableIDs, dbs.inTransaction);
        /** @type {Set<bigint>} */
        const allTagIDs = new Set();
        for (const tagIDs of taggablePairings.values()) {
            for (const tagID of tagIDs) {
                allTagIDs.add(tagID);
            }
        }

        const userFacingLocalTags = await UserFacingLocalTags.selectManyByTagIDs(dbs, allTagIDs, localTagServiceIDs);
        const userFacingLocalTagsMap = new Map(userFacingLocalTags.map(userFacingLocalTag => [userFacingLocalTag.Tag_ID, userFacingLocalTag]));

        for (const [taggableID, tagIDs] of taggablePairings) {
            taggablesUserFacingLocalTags.set(taggableID, tagIDs.map(
                tagID => userFacingLocalTagsMap.get(tagID)
            ).filter(tag => tag !== undefined));
        }

        return taggablesUserFacingLocalTags;
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} namespaceIDs 
     * @param {number[]} localTagServiceIDs 
     */
    static async selectManyByNamespaceIDs(dbs, namespaceIDs, localTagServiceIDs) {
        /** @type {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} */
        const dbUserFacingLocalTags = await dballselect(dbs, `
            SELECT LT.Tag_ID, LT.Local_Tag_ID, LT.Display_Name, LT.Local_Tag_Service_ID
              FROM Local_Tags LT
              JOIN Tags T ON LT.Tag_ID = T.Tag_ID
              JOIN Tags_Namespaces TN ON T.Tag_ID = TN.Tag_ID
             WHERE LT.Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
               AND TN.Namespace_ID IN ${dbvariablelist(namespaceIDs.length)}
            ;`, [...localTagServiceIDs, ...namespaceIDs]
        );

        return await mapUserFacingLocalTags(dbs, dbUserFacingLocalTags);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} namespaceID
     * @param {number[]} localTagServiceIDs 
     */
    static async selectManyByNamespaceID(dbs, namespaceID, localTagServiceIDs) {
        return await UserFacingLocalTags.selectManyByNamespaceIDs(dbs, [namespaceID], localTagServiceIDs);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagServiceIDs
     */
    static async selectManyByLocalTagServiceIDs(dbs, localTagServiceIDs) {
        /** @type {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} */
        const dbUserFacingLocalTags = await dballselect(dbs, `
            SELECT Tag_ID, Local_Tag_ID, Display_Name, Local_Tag_Service_ID
              FROM Local_Tags
             WHERE Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
            ;`, localTagServiceIDs
        );

        return await mapUserFacingLocalTags(dbs, dbUserFacingLocalTags);
    }

    /**
     * @param {Databases} dbs 
     * @param {Iterable<bigint>} tagIDsIterable 
     * @param {number[]} localTagServiceIDs
     * @returns {Promise<UserFacingLocalTag[]>}
     */
    static async selectManyByTagIDs(dbs, tagIDsIterable, localTagServiceIDs) {
        const tagIDs = [...tagIDsIterable].map(tagID => Number(tagID));

        if (tagIDs.length === 0 || localTagServiceIDs.length === 0) {
            return [];
        }
        if (tagIDs.length > 10000) {
            const slices = await asyncDataSlicer(tagIDs, 10000, (sliced) => UserFacingLocalTags.selectManyByTagIDs(dbs, sliced, localTagServiceIDs));
            return slices.flat();
        }

        /** @type {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} */
        const dbUserFacingLocalTags = await dballselect(dbs, `
            SELECT Tag_ID, Local_Tag_ID, Display_Name, Local_Tag_Service_ID
              FROM Local_Tags
            WHERE Tag_ID IN ${dbvariablelist(tagIDs.length)}
            AND Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
        `, [...tagIDs, ...localTagServiceIDs]);
        return await mapUserFacingLocalTags(dbs, dbUserFacingLocalTags);
    }
};

/**
 * @typedef {Object} DBTag
 * @property {bigint} Tag_ID
 * @property {number} Tag_Created_Date
 */

/**
 * @param {DBTag} dbTag
 */
function mapDBTag(dbTag) {
    return {
        ...dbTag,
        Tag_ID: BigInt(dbTag.Tag_ID)
    };
}

export class Tags {
    /**
     * @param {Databases} dbs
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static async upsertMappedToTaggables(dbs, tagPairings) {
        const ok = await dbs.perfTags.insertTagPairings(tagPairings, dbs.inTransaction);
        if (!ok) {
            console.log(dbs.perfTags);
            throw "Perf tags failed to insert tag pairings";
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {number} amount 
     */
    static async insertMany(dbs, amount) {
        const now = Math.floor(Date.now() / 1000);
        const nows = [];
        for (let i = 0; i < amount; ++i) {
            nows.push(now);
        }

        /** @type {DBTag[]} */
        const dbTags = await dball(dbs, `INSERT INTO Tags(Tag_Created_Date) VALUES ${dbtuples(amount, 1)} RETURNING *;`, nows);
        return dbTags.map(mapDBTag);
    }

    /**
     * @param {Databases} dbs 
     */
    static async insert(dbs) {
        return (await Tags.insertMany(dbs, 1))[0];
    }
}


/**
 * @typedef {Object} PreInsertLocalTag
 * @property {string} Lookup_Name
 * @property {string} Source_Name
 * @property {string} Display_Name
 */

/**
 * @typedef {Object} DBLocalTag
 * @property {number} Local_Tag_ID,
 * @property {bigint} Tag_ID
 * @property {number} Local_Tag_Service_ID
 * @property {string} Lookup_Name
 * @property {string} Source_Name
 * @property {string} Local_Tags_PK_Hash
 * @property {string} Display_Name
 */

/**
 * @param {DBLocalTag} dbLocalTag 
 * @returns 
 */
function mapDBLocalTag(dbLocalTag) {
    return {
        ...dbLocalTag,
        Tag_ID: BigInt(dbLocalTag.Tag_ID)
    }
}

export class LocalTags {
    /**
     * @param {Databases} dbs 
     * @param {DBLocalTag[]} localTags
     */
    static async deleteMany(dbs, localTags) {
        if (localTags.length === 0) {
            return;
        }

        const localTagServices = await LocalTagServices.selectManyByLocalTagIDs(dbs, localTags.map(localTag => localTag.Local_Tag_ID));
        if (localTagServices.some(localTagService => localTagService.User_Editable === 0)) {
            throw "Cannot delete tag from local tag service with user editable set to 0";
        }

        dbs = await dbBeginTransaction();

        await dbs.perfTags.deleteTags(localTags.map(localTag => localTag.Tag_ID), dbs.inTransaction);
        await dbrun(dbs, `DELETE FROM Local_Tags WHERE Local_Tag_ID IN ${dbvariablelist(localTags.length)}`, localTags.map(localTag => localTag.Local_Tag_ID));
        await dbrun(dbs, `DELETE FROM Tags WHERE Tag_ID IN ${dbvariablelist(localTags.length)}`, localTags.map(localTag => Number(localTag.Tag_ID)));

        await dbEndTransaction();
    }
    /**
     * @param {Databases} dbs 
     * @param {DBLocalTag} localTag 
     */
    static async delete(dbs, localTag) {
        return await LocalTags.deleteMany(dbs, [localTag]);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagIDs 
     */
    static async selectManyByIDs(dbs, localTagIDs) {
        if (localTagIDs.length === 0) {
            return [];
        }

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `SELECT * FROM Local_Tags WHERE Local_Tag_ID IN ${dbvariablelist(localTagIDs.length)}`, localTagIDs);
        return dbLocalTags.map(mapDBLocalTag);
    }
    /**
     * @param {Databases} dbs 
     * @param {number} localTagID 
     */
    static async selectByID(dbs, localTagID) {
        return (await LocalTags.selectManyByIDs(dbs, [localTagID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {{Lookup_Name: string, Source_Name: string}[]} tagLookups 
     * @param {number} localTagServiceID
     */
    static async selectManyByLookups(dbs, tagLookups, localTagServiceID) {
        if (tagLookups.length === 0) {
            return [];
        }

        const tagPKHashes = tagLookups.map(tagLookup => localTagsPKHash(tagLookup.Lookup_Name, tagLookup.Source_Name));

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `SELECT * FROM Local_Tags WHERE Local_Tag_Service_ID = ? AND Local_Tags_PK_Hash IN ${dbvariablelist(tagPKHashes.length)};`, [localTagServiceID, ...tagPKHashes]);
        return dbLocalTags.map(mapDBLocalTag);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalTag[]} localTags 
     * @param {number} localTagServiceID
     * @param {DBTag[]=} preCreatedTags
     * @returns {Promise<DBLocalTag[]>}
     */
    static async insertMany(dbs, localTags, localTagServiceID, preCreatedTags) {
        if (preCreatedTags !== undefined && preCreatedTags.length !== localTags.length) {
            throw "Pre-created tags were provided to insert local tags, but the length of the pre-created tags did not match the local tags length";
        }
        if (localTags.length === 0) {
            return [];
        }
        if (localTags.length > 2000) {
            const slices = await asyncDataSlicer(localTags, 2000, (sliced) => LocalTags.insertMany(dbs, sliced, localTagServiceID));
            return slices.flat();
        }

        preCreatedTags ??= await Tags.insertMany(dbs, localTags.length);

        const tagInsertionParams = [];
        for (let i = 0; i < localTags.length; ++i) {
            const localTag = localTags[i];
            tagInsertionParams.push(Number(preCreatedTags[i].Tag_ID));
            tagInsertionParams.push(localTagServiceID);
            tagInsertionParams.push(localTag.Lookup_Name);
            tagInsertionParams.push(localTag.Source_Name);
            tagInsertionParams.push(localTagsPKHash(localTag.Lookup_Name, localTag.Source_Name));
            tagInsertionParams.push(localTag.Display_Name);
        }

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dball(dbs, `
            INSERT INTO Local_Tags(
                Tag_ID,
                Local_Tag_Service_ID,
                Lookup_Name,
                Source_Name,
                Local_Tags_PK_Hash,
                Display_Name
            ) VALUES ${dbtuples(localTags.length, 6)} RETURNING *;
            `, tagInsertionParams
        );
        return dbLocalTags.map(mapDBLocalTag);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalTag} localTag
     * @param {number} localTagServiceID
     * @param {DBTag=} preCreatedTag
     */
    static async insert(dbs, localTag, localTagServiceID, preCreatedTag) {
        return (await LocalTags.insertMany(dbs, [localTag], localTagServiceID, [preCreatedTag]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalTag[]} localTags
     * @param {number} localTagServiceID
     */
    static async upsertMany(dbs, localTags, localTagServiceID) {
        if (localTags.length === 0) {
            return [];
        }
        // dedupe
        localTags = [...(new Map(localTags.map(tag => [localTagsPKHash(tag.Lookup_Name, tag.Source_Name), tag]))).values()];

        const dbLocalTags = await LocalTags.selectManyByLookups(dbs, localTags, localTagServiceID);
        const dbLocalTagsExisting = new Set(dbLocalTags.map(dbTag => dbTag.Local_Tags_PK_Hash));
        const tagsToInsert = localTags.filter(localTag => !dbLocalTagsExisting.has(localTagsPKHash(localTag.Lookup_Name, localTag.Source_Name)));
        const insertedDBTags = await LocalTags.insertMany(dbs, tagsToInsert, localTagServiceID); 

        return dbLocalTags.concat(insertedDBTags);
    }
};

/**
 * @typedef {Object} DBFileExtension
 * @property {number} File_Extension_ID
 * @property {bigint} Has_File_Extension_Tag_ID
 * @property {string} File_Extension
 * @property {number} File_Extension_Created_Date
 */


/**
 * @param {DBFileExtension} dbFileExtension
 */
function mapDBFileExtension(dbFileExtension) {
    return {
        ...dbFileExtension,
        Has_File_Extension_Tag_ID: BigInt(dbFileExtension.Has_File_Extension_Tag_ID)
    };
}

export class FileExtensions {
    /**
     * @param {string} fileExtension 
     */
    static normalize(fileExtension) {
        fileExtension = fileExtension.toLowerCase();
        if (fileExtension === ".jpeg") {
            return ".jpg";
        }
        if (fileExtension === ".tif") {
            return ".tiff";
        }

        return fileExtension;
    }


    /**
     * @param {Databases} dbs 
     * @param {string[]} fileExtensions
     */
    static async selectMany(dbs, fileExtensions) {
        /** @type {DBFileExtension[]} */
        const dbFileExtensions = await dballselect(dbs, `SELECT * FROM File_Extensions WHERE File_Extension IN ${dbvariablelist(fileExtensions.length)};`, fileExtensions);
        return dbFileExtensions.map(mapDBFileExtension);
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} fileExtensions
     */
    static async insertMany(dbs, fileExtensions) {
        if (fileExtensions.length === 0) {
            return [];
        }

        const insertedHasFileExtensionTags = await LocalTags.insertMany(dbs, fileExtensions.map(fileExtension => normalPreInsertLocalTag(
            `system:has file extension:${fileExtension}`,
            "System generated"
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const fileExtensionInsertionParams = [];
        for (let i = 0; i < fileExtensions.length; ++i) {
            fileExtensionInsertionParams.push(fileExtensions[i]);
            fileExtensionInsertionParams.push(Number(insertedHasFileExtensionTags[i].Tag_ID));
        }

        /** @type {DBFileExtension[]} */
        const insertedDBFileExtensions = await dball(dbs, `
            INSERT INTO File_Extensions(
                File_Extension,
                Has_File_Extension_Tag_ID
            ) VALUES ${dbtuples(fileExtensions.length, 2)} RETURNING *;
            `, fileExtensionInsertionParams
        );

        return insertedDBFileExtensions.map(mapDBFileExtension);
    }

    /**
     * @param {Databases} dbs
     * @param {string[]} fileExtensions 
     */
    static async upsertMany(dbs, fileExtensions) {
        if (fileExtensions.length === 0) {
            return [];
        }
        fileExtensions = fileExtensions.map(FileExtensions.normalize);
        // dedupe
        fileExtensions = [...new Set(fileExtensions)];

        const dbFileExtensions = await FileExtensions.selectMany(dbs, fileExtensions);
        const dbFileExtensionsExisting = new Set(dbFileExtensions.map(dbFileExtension => dbFileExtension.File_Extension));
        const fileExtensionsToInsert = fileExtensions.filter(fileExtension => !dbFileExtensionsExisting.has(fileExtension));
        const insertedDBFileExtensions = await FileExtensions.insertMany(dbs, fileExtensionsToInsert);

        return dbFileExtensions.concat(insertedDBFileExtensions);
    }
};


/**
 * @typedef {Object} DBTagNamespace
 * @property {number} Tags_Namespaces_ID
 * @property {bigint} Tag_ID 
 * @property {number} Namespace_ID
 * @property {string} Tags_Namespaces_PK_Hash
 */

/**
 * @typedef {Object} PreInsertTagNamespace
 * @property {bigint} Tag_ID
 * @property {number} Namespace_ID
 * 
 * @typedef {PreInsertTagNamespace & {Tags_Namespaces_PK_Hash: string}} PreparedPreInsertTagNamespace
 */

/**
 * @param {DBTagNamespace} dbTagNamespace 
 */
function mapDBTagNamespace(dbTagNamespace) {
    return {
        ...dbTagNamespace,
        Tag_ID: BigInt(dbTagNamespace.Tag_ID)
    };
}

export class TagsNamespaces {
    /**
     * @param {PreInsertTagNamespace} preInsertTagNamespace
     */
    static preparePreInsert(preInsertTagNamespace) {
        return {
            ...preInsertTagNamespace,
            Tags_Namespaces_PK_Hash: `${preInsertTagNamespace.Tag_ID}\x01${preInsertTagNamespace.Namespace_ID}`
        };
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} tagIDs
     * @returns {Promise<{Namespace_Name: string, Tag_ID: bigint}[]>}
     */
    static async selectManyMappedByTagIDs(dbs, tagIDs) {
        if (tagIDs.length === 0) {
            return [];
        }
        
        return (await dballselect(dbs, `
            SELECT N.Namespace_Name, TN.Tag_ID
              FROM Tags_Namespaces TN
              JOIN Namespaces N ON TN.Namespace_ID = N.Namespace_ID
             WHERE TN.Tag_ID IN ${dbvariablelist(tagIDs.length)}`,
            tagIDs.map(tagID => Number(tagID))
        )).map(result => ({
            ...result,
            Tag_ID: BigInt(result.Tag_ID)
        }));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertTagNamespace[]} tagsNamespaces 
     */
    static async selectMany(dbs, tagsNamespaces) {
        if (tagsNamespaces.length === 0) {
            return [];
        }

        /** @type {DBTagNamespace[]} */
        const dbTagsNamespaces = await dballselect(dbs,
            `SELECT * FROM Tags_Namespaces WHERE Tags_Namespaces_PK_Hash IN ${dbvariablelist(tagsNamespaces.length)};`,
            tagsNamespaces.map(tagNamespace => tagNamespace.Tags_Namespaces_PK_Hash)
        );
        return dbTagsNamespaces.map(mapDBTagNamespace);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} namespaceIDs
     */
    static async selectManyByNamespaceIDs(dbs, namespaceIDs) {
        if (namespaceIDs.length === 0) {
            return [];
        }

        /** @type {DBTagNamespace[]} */
        const dbTagsNamespaces = await dballselect(dbs,
            `SELECT * FROM Tags_Namespaces WHERE Namespace_ID IN ${dbvariablelist(namespaceIDs.length)};`,
            namespaceIDs
        );
        return dbTagsNamespaces.map(mapDBTagNamespace);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertTagNamespace[]} tagsNamespaces 
     */
    static async insertMany(dbs, tagsNamespaces) {
        if (tagsNamespaces.length === 0) {
            return [];
        }

        const tagsNamespacesInsertionParams = [];
        for (const tagNamespace of tagsNamespaces) {
            tagsNamespacesInsertionParams.push(Number(tagNamespace.Tag_ID));
            tagsNamespacesInsertionParams.push(tagNamespace.Namespace_ID);
            tagsNamespacesInsertionParams.push(tagNamespace.Tags_Namespaces_PK_Hash);
        }

        const insertedDBTagNamespaces = await dball(dbs, `
            INSERT INTO Tags_Namespaces(
                Tag_ID,
                Namespace_ID,
                Tags_Namespaces_PK_Hash
            ) VALUES ${dbtuples(tagsNamespaces.length, 3)} RETURNING *;
            `, tagsNamespacesInsertionParams
        );
        return insertedDBTagNamespaces.map(mapDBTagNamespace);
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, Iterable<number>>} tagNamespacePairings 
     */
    static async upsertMany(dbs, tagNamespacePairings) {
        /** @type {PreparedPreInsertTagNamespace[]} */
        let preparedTagsNamespaces = [];
        for (const [Tag_ID, Namespace_IDs] of tagNamespacePairings) {
            for (const Namespace_ID of Namespace_IDs) {
                preparedTagsNamespaces.push(TagsNamespaces.preparePreInsert({
                    Tag_ID,
                    Namespace_ID
                }));
            }
        }

        // dedupe
        preparedTagsNamespaces = [...(new Map(preparedTagsNamespaces.map(preparedTagNamespace => [preparedTagNamespace.Tags_Namespaces_PK_Hash, preparedTagNamespace]))).values()];

        const dbTagsNamespaces = await TagsNamespaces.selectMany(dbs, preparedTagsNamespaces);
        const dbTagsNamespacesExisting = new Set(dbTagsNamespaces.map(dbTagNamespace => dbTagNamespace.Tags_Namespaces_PK_Hash));
        const tagsNamespacesToInsert = preparedTagsNamespaces.filter(tagNamespace => !dbTagsNamespacesExisting.has(tagNamespace.Tags_Namespaces_PK_Hash));
        const insertedDBTagNamespaces = await TagsNamespaces.insertMany(dbs, tagsNamespacesToInsert);

        return dbTagsNamespaces.concat(insertedDBTagNamespaces);
    }
}

/**
 * @typedef {Object} DBNamespace
 * @property {number} Namespace_ID
 * @property {string} Namespace_Name
 * @property {number} Namespace_Created_Date
 */

export class Namespaces {
    /**
     * @param {Databases} dbs 
     * @param {string[]} namespaces 
     */
    static async selectMany(dbs, namespaces) {
        if (namespaces.length === 0) {
            return [];
        }

        /** @type {DBNamespace[]} */
        const dbNamespaces = await dballselect(dbs, `SELECT * FROM Namespaces WHERE Namespace_Name IN ${dbvariablelist(namespaces.length)};`, namespaces);
        return dbNamespaces;
    }

    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBNamespace[]} */
        const dbNamespaces = await dballselect(dbs, `SELECT * FROM Namespaces;`);
        return dbNamespaces;
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} namespaces 
     */
    static async insertMany(dbs, namespaces) {
        if (namespaces.length === 0) {
            return [];
        }

        /** @type {DBNamespace[]} */
        const insertedDBNamespaces = await dballselect(dbs, `
            INSERT INTO Namespaces(
                Namespace_Name
            ) VALUES ${dbtuples(namespaces.length, 1)} RETURNING *;
            `, namespaces
        );
        return insertedDBNamespaces;
    }

    /**
     * @param {Databases} dbs
     * @param {string[]} namespaces 
     */
    static async upsertMany(dbs, namespaces) {
        if (namespaces.length === 0) {
            return [];
        }
        // dedupe
        namespaces = [...new Set(namespaces)];

        const dbNamespaces = await Namespaces.selectMany(dbs, namespaces);
        const dbNamespacesExisting = new Set(dbNamespaces.map(dbNamespace => dbNamespace.Namespace_Name));
        const namespacesToInsert = namespaces.filter(namespace => !dbNamespacesExisting.has(namespace));
        const insertedDBNamespaces = await Namespaces.insertMany(dbs, namespacesToInsert);

        return dbNamespaces.concat(insertedDBNamespaces);
    }
}

/**
 * @typedef {Object} DBURL
 * @property {number} URL_ID
 * @property {string} URL
 * @property {bigint} Has_URL_Tag_ID
 * @property {number} URL_Created_Date
 */

/**
 * @param {DBURL} dbURL 
 */
function mapDBURL(dbURL) {
    return {
        ...dbURL,
        Has_URL_Tag_ID: BigInt(dbURL.Has_URL_Tag_ID)
    };
}

export class URLs {
    /**
     * @param {Databases} dbs 
     * @param {string[]} urls 
     */
    static async selectMany(dbs, urls) {
        if (urls.length === 0) {
            return [];
        }

        /** @type {DBURL[]} */
        const dbURLs = await dballselect(dbs, `SELECT * FROM URLs WHERE URL IN ${dbvariablelist(urls.length)};`, urls);
        return dbURLs.map(mapDBURL);
    }

    /**
     * @param {Databases} dbs
     * @param {string[]} urls
     */
    static async insertMany(dbs, urls) {
        if (urls.length === 0) {
            return [];
        }

        const insertedHasURLTags = await LocalTags.insertMany(dbs, urls.map(url => normalPreInsertLocalTag(
            `system:has url:${url}`,
            "System generated"
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const urlInsertionParams = [];
        for (let i = 0; i < urls.length; ++i) {
            urlInsertionParams.push(urls[i]);
            urlInsertionParams.push(Number(insertedHasURLTags[i].Tag_ID));
        }

        /** @type {DBURL[]} */
        const insertedDBURLs = await dball(dbs, `
            INSERT INTO URLs(
                URL,
                Has_URL_Tag_ID
            ) VALUES ${dbtuples(urls.length, 2)} RETURNING *;
            `, urlInsertionParams
        );

        return insertedDBURLs.map(mapDBURL);
    }

    /**
     * @param {Databases} dbs
     * @param {string[]} urls 
     */
    static async upsertMany(dbs, urls) {
        if (urls.length === 0) {
            return [];
        }

        // dedupe
        urls = [...new Set(urls)];

        const dbURLs = await URLs.selectMany(dbs, urls);
        const dbURLsExisting = new Set(dbURLs.map(dbURL => dbURL.URL));
        const urlsToInsert = urls.filter(url => !dbURLsExisting.has(url));
        const insertedDBURLs = await URLs.insertMany(dbs, urlsToInsert);
        return dbURLs.concat(insertedDBURLs);
    }
}

/**
 * @typedef {Object} DBURLAssociation
 * @property {number} URL_Association_ID
 * @property {number} URL_ID
 * @property {string} URL_Association
 * @property {string} URL_Associations_PK_Hash
 * @property {bigint} Has_URL_With_Association_Tag_ID
 * @property {number} URL_Association_Created_Date
 */

/** @typedef {DBURL & DBURLAssociation} DBJoinedURLAssociation */

/**
 * @typedef {DBURL & {URL_Association: string}} PreInsertURLAssociation
 * @typedef {PreInsertURLAssociation & {URL_Associations_PK_Hash: string} PreparedPreInsertURLAssociation}
 */


/**
 * @param {DBURLAssociation} dbURLAssociation
 * @param {PreInsertURLAssociation} preInsertURLAssociation
 * @returns {DBJoinedURLAssociation}
 */
function mapDBURLAssociation(dbURLAssociation, preInsertURLAssociation) {
    return {
        ...preInsertURLAssociation,
        ...dbURLAssociation,
        Has_URL_With_Association_Tag_ID: BigInt(dbURLAssociation.Has_URL_With_Association_Tag_ID)
    };
}

export class URLAssociations {
    /**
     * @param {PreInsertURLAssociation} urlAssociation 
     * @returns {PreparedPreInsertURLAssociation}
     */
    static preparePreInsert(urlAssociation) {
        return {
            ...urlAssociation,
            URL_Associations_PK_Hash: `${urlAssociation.URL_ID}\x01${urlAssociation.URL_Association}`
        };
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertURLAssociation[]} urlAssociations 
     */
    static async selectMany(dbs, urlAssociations) {
        if (urlAssociations.length === 0) {
            return [];
        }

        const urlAssociationsMap = new Map(urlAssociations.map(urlAssociation => [urlAssociation.URL_Associations_PK_Hash, urlAssociation]));

        /** @type {DBURLAssociation[]} */
        const dbURLAssociations = await dballselect(dbs,
            `SELECT * FROM URL_Associations WHERE URL_Associations_PK_Hash IN ${dbvariablelist(urlAssociations.length)};`,
            urlAssociations.map(urlAssociation => urlAssociation.URL_Associations_PK_Hash)
        );
        return dbURLAssociations.map(dbURLAssociation => mapDBURLAssociation(dbURLAssociation, urlAssociationsMap.get(dbURLAssociation.URL_Associations_PK_Hash)));
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertURLAssociation[]} urlAssociations 
     */
    static async insertMany(dbs, urlAssociations) {
        if (urlAssociations.length === 0) {
            return [];
        }

        const urlAssociationsMap = new Map(urlAssociations.map(urlAssociation => [urlAssociation.URL_Associations_PK_Hash, urlAssociation]));

        const insertedHasURLAssociationTags = await LocalTags.insertMany(dbs, urlAssociations.map(urlAssociation => normalPreInsertLocalTag(
            `system:has url with association:${urlAssociation.URL} with association ${urlAssociation.URL_Association}`,
            "System generated"
        )), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const urlAssociationInsertionParams = [];
        for (let i = 0; i < urlAssociations.length; ++i) {
            urlAssociationInsertionParams.push(urlAssociations[i].URL_ID);
            urlAssociationInsertionParams.push(urlAssociations[i].URL_Association);
            urlAssociationInsertionParams.push(urlAssociations[i].URL_Associations_PK_Hash);
            urlAssociationInsertionParams.push(Number(insertedHasURLAssociationTags[i].Tag_ID));
        }

        /** @type {DBURLAssociation[]} */
        const insertedDBURLAssociations = await dball(dbs, `
            INSERT INTO URL_Associations(
                URL_ID,
                URL_Association,
                URL_Associations_PK_Hash,
                Has_URL_With_Association_Tag_ID
            ) VALUES ${dbtuples(urlAssociations.length, 4)} RETURNING *;
            `, urlAssociationInsertionParams
        );


        return insertedDBURLAssociations.map(dbURLAssociation => mapDBURLAssociation(dbURLAssociation, urlAssociationsMap.get(dbURLAssociation.URL_Associations_PK_Hash)));
    }

    /**
     * @param {Databases} dbs
     * @param {PreInsertURLAssociation[]} urlAssociations
     */
    static async upsertMany(dbs, urlAssociations) {
        if (urlAssociations.length === 0) {
            return [];
        }

        let preparedURLAssociations = urlAssociations.map(URLAssociations.preparePreInsert);
        // dedupe
        preparedURLAssociations = [...(new Map(preparedURLAssociations.map(urlAssociation => [urlAssociation.URL_Associations_PK_Hash, urlAssociation]))).values()];
        const dbURLAssociations = await URLAssociations.selectMany(dbs, preparedURLAssociations);
        const dbURLAssociationsExisting = new Set(dbURLAssociations.map(dbURLAssociation => dbURLAssociation.URL_Associations_PK_Hash));
        const urlAssociationsToInsert = preparedURLAssociations.filter(urlAssociation => !dbURLAssociationsExisting.has(urlAssociation.URL_Associations_PK_Hash));
        const dbURLAssociationsInserted = await URLAssociations.insertMany(dbs, urlAssociationsToInsert);

        return dbURLAssociations.concat(dbURLAssociationsInserted);
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, DBJoinedURLAssociation[]>} taggableURLAssociationPairings
     */
    static async upsertToTaggables(dbs, taggableURLAssociationPairings) {
        /** @type {Map<bigint, bigint[]>} */
        const tagPairings = new Map([[HAS_URL_TAG.Tag_ID, []]]);
        for (const [taggableID, dbJoinedURLAssociations] of taggableURLAssociationPairings) {
            for (const dbJoinedURLAssociation of dbJoinedURLAssociations) {
                if (tagPairings.get(dbJoinedURLAssociation.Has_URL_Tag_ID) === undefined) {
                    tagPairings.set(dbJoinedURLAssociation.Has_URL_Tag_ID, [])
                }
                if (tagPairings.get(dbJoinedURLAssociation.Has_URL_With_Association_Tag_ID) === undefined) {
                    tagPairings.set(dbJoinedURLAssociation.Has_URL_With_Association_Tag_ID, []);
                }
                tagPairings.get(dbJoinedURLAssociation.Has_URL_Tag_ID).push(taggableID);
                tagPairings.get(dbJoinedURLAssociation.Has_URL_With_Association_Tag_ID).push(taggableID);
                tagPairings.get(HAS_URL_TAG.Tag_ID).push(taggableID);
            }
        }

        await dbs.perfTags.insertTagPairings(tagPairings, dbs.inTransaction);
    }
}