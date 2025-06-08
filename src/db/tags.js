import { SYSTEM_LOCAL_TAG_SERVICE, localTagsPKHash } from "../client/js/tags.js";
import { PERMISSIONS, User } from "../client/js/user.js";
import {asyncDataSlicer, dball, dbget, dbsqlcommand, dbtuples, dbvariablelist} from "./db-util.js";
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
 * @typedef {Object} PreInsertLocalTag
 * @property {string} Lookup_Name
 * @property {string} Source_Name
 * @property {string} Display_Name
 */

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

/**
 * @typedef {Object} DBTag
 * @property {bigint} Tag_ID
 * @property {number} Tag_Created_Date
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
 * @typedef {Object} DBFileExtension
 * @property {number} File_Extension_ID
 * @property {bigint} Has_File_Extension_Tag_ID
 * @property {string} File_Extension
 * @property {number} File_Extension_Created_Date
 */

/**
 * @typedef {Object} DBNamespace
 * @property {number} Namespace_ID
 * @property {string} Namespace_Name
 * @property {number} Namespace_Created_Date
 */

/**
 * @typedef {Object} DBTagNamespacePairing
   @property {bigint} Tag_ID 
   @property {number} Namespace_ID
   @property {string} Tags_Namespaces_PK_Hash
 */

/**
 * @typedef {Object} DBURL
 * @property {number} URL_ID
 * @property {string} URL
 * @property {bigint} Has_URL_Tag_ID
 * @property {number} URL_Created_Date
 */

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
 * @param {Databases} dbs
 * @param {Map<bigint, bigint[]>} tagPairings 
 */
export async function addTagsToTaggables(dbs, tagPairings) {
    const ok = await dbs.perfTags.insertTagPairings(tagPairings);
    if (!ok) {
        console.log(dbs.perfTags);
        throw "Perf tags failed to insert tag pairings";
    }
}

/**
 * @param {Databases} dbs 
 * @param {number} localTagServiceID 
 * @returns {Promise<DBJoinedLocalTagService>}
 */
export async function selectLocalTagService(dbs, localTagServiceID) {
    return await dbget(dbs, `
        SELECT *
          FROM Local_Tag_Services LTS
          JOIN Services S ON LTS.Service_ID = S.Service_ID
          WHERE Local_Tag_Service_ID = ?;
        `, localTagServiceID
    );

}

/**
 * @param {Databases} dbs 
 * @param {User} user
 * @param {PermissionInt} permissionBitsToCheck
 * @param {number} localTagServiceID
 * @returns {Promise<DBJoinedLocalTagService>}
 */
export async function userSelectLocalTagService(dbs, user, permissionBitsToCheck, localTagServiceID) {
    if (user.isSudo() || user.hasPermissions(permissionBitsToCheck, PERMISSIONS.LOCAL_TAG_SERVICES)) {
        return await selectLocalTagService(dbs, localTagServiceID);
    }

    return await dbget(dbs, `
        SELECT LTS.*, S.*
          FROM Local_Tag_Services LTS
          JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
          JOIN Services S ON LTS.Service_ID = S.Service_ID
         WHERE LTS.Local_Tag_Service_ID = $localTagServiceID
           AND SUP.User_ID = $userID
           AND (SUP.Permission_Extent & $permissionBitsToCheck) = $permissionBitsToCheck;
    `, {
        $localTagServiceID: localTagServiceID,
        $userID: user.id(),
        $permissionBitsToCheck: permissionBitsToCheck
    });
}

/** @returns {Promise<DBJoinedLocalTagService[]>} */
export async function selectAllLocalTagServices(dbs) {
    return await dball(dbs, `
        SELECT *
          FROM Local_Tag_Services LTS
          JOIN Services S ON LTS.Service_ID = S.Service_ID;
    `);
}

/**
 * 
 * @param {Databases} dbs 
 * @param {User} user 
 */
export async function userSelectAllLocalTagServices(dbs, user) {
    const userSelectedPermissionedLocalTagServices = await userSelectAllSpecificTypedServicesHelper(
        dbs,
        user,
        PERMISSIONS.LOCAL_TAG_SERVICES,
        selectAllLocalTagServices,
        async () => {
            return await dball(dbs, `
                SELECT SUP.Permission_Extent, LTS.*, S.*
                  FROM Local_Tag_Services LTS
                  JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
                  JOIN Services S ON LTS.Service_ID = S.Service_ID
                 WHERE SUP.User_ID = $userID;
            `, {$userID: user.id()});
        }
    );

    return userSelectedPermissionedLocalTagServices.filter(dbLocalTagService => dbLocalTagService.User_Editable !== 0);
}

/**
 * @param {Databases} dbs 
 * @param {{Lookup_Name: string, Source_Name: string}[]} tagLookups 
 * @param {number} localTagServiceID
 */
async function selectLocalTags(dbs, tagLookups, localTagServiceID) {
    if (tagLookups.length === 0) {
        return [];
    }

    const tagPKHashes = tagLookups.map(tagLookup => localTagsPKHash(tagLookup.Lookup_Name, tagLookup.Source_Name));

    /** @type {DBLocalTag[]} */
    const dbTags = await dball(dbs, `SELECT * FROM Local_Tags WHERE Local_Tag_Service_ID = ? AND Local_Tags_PK_Hash IN ${dbvariablelist(tagPKHashes.length)};`, [localTagServiceID, ...tagPKHashes]);
    return dbTags.map(dbTag => ({
        ...dbTag,
        Tag_ID: BigInt(dbTag.Tag_ID)
    }));
}

/**
 * 
 * @param {Databases} dbs 
 * @param {number} amount 
 */
async function insertTags(dbs, amount) {
    const now = Math.floor(Date.now() / 1000);
    const nows = [];
    for (let i = 0; i < amount; ++i) {
        nows.push(now);
    }
    
    /** @type {DBTag[]} */
    const dbTags = await dball(dbs, `INSERT INTO Tags(Tag_Created_Date) VALUES ${dbtuples(amount, 1)} RETURNING *;`, nows);
    return dbTags.map(dbTag => ({
        ...dbTag,
        Tag_ID: BigInt(dbTag.Tag_ID)
    }))
}

/**
 * @param {Databases} dbs 
 * @param {PreInsertLocalTag[]} localTags 
 * @param {number} localTagServiceID
 * @returns {Promise<DBLocalTag[]>}
 */
export async function insertLocalTags(dbs, localTags, localTagServiceID) {
    if (localTags.length === 0) {
        return [];
    }
    if (localTags.length > 2000) {
        return (await asyncDataSlicer(localTags, 2000, sliced => insertLocalTags(dbs, sliced, localTagServiceID))).flat();
    }
    
    const dbTags = await insertTags(dbs, localTags.length);

    const tagInsertionParams = [];
    for (let i = 0; i < localTags.length; ++i) {
        const localTag = localTags[i];
        tagInsertionParams.push(Number(dbTags[i].Tag_ID));
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
    return dbLocalTags.map(dbLocalTag => ({
        ...dbLocalTag,
        Tag_ID: BigInt(dbLocalTag.Tag_ID)
    }));
}

/**
 * @param {Databases} dbs 
 * @param {PreInsertLocalTag[]} localTags
 * @param {number} localTagServiceID
 */
export async function upsertLocalTags(dbs, localTags, localTagServiceID) {
    if (localTags.length === 0) {
        return [];
    }

    const dbLocalTags = await selectLocalTags(dbs, localTags, localTagServiceID);
    const dbLocalTagsExisting = new Set(dbLocalTags.map(dbTag => dbTag.Local_Tags_PK_Hash));
    const tagsToInsert = localTags.filter(localTag => !dbLocalTagsExisting.has(localTagsPKHash(localTag.Lookup_Name, localTag.Source_Name)));
    const insertedDBTags = await insertLocalTags(dbs, tagsToInsert, localTagServiceID); 

    return [...dbLocalTags, ...insertedDBTags];
}


/**
 * 
 * @param {bigint} tagID 
 * @param {number} namespaceID 
 * @returns 
 */
export function tagNamespacePKHash(tagID, namespaceID) {
    return `${tagID}\x01${namespaceID}`;
}

/**
 * @param {Databases} dbs 
 * @param {Map<bigint, Iterable<number>>} tagNamespacePairings 
 */
export async function updateTagsNamespaces(dbs, tagNamespacePairings) {
    /** @type {{Tag_ID: bigint, Namespace_ID: number, Tags_Namespaces_PK_Hash: string}[]} */
    const tagNamespacePairingsWithHash = [];
    for (const [Tag_ID, Namespace_IDs] of tagNamespacePairings) {
        for (const Namespace_ID of Namespace_IDs) {
            const Tags_Namespaces_PK_Hash = tagNamespacePKHash(Tag_ID, Namespace_ID);
            tagNamespacePairingsWithHash.push({
                Tag_ID,
                Namespace_ID,
                Tags_Namespaces_PK_Hash
            });
        }
    }

    /** @type {DBTagNamespacePairing[]} */
    const dbTagNamespacePairings = await dball(dbs,
        `SELECT * FROM Tags_Namespaces WHERE Tags_Namespaces_PK_Hash IN ${dbvariablelist(tagNamespacePairingsWithHash.length)};`,
        tagNamespacePairingsWithHash.map(tagNamespacePairingWithHash => tagNamespacePairingWithHash.Tags_Namespaces_PK_Hash)
    );
    const dbTagNamespacePairingsMap = new Map(dbTagNamespacePairings.map(dbTagNamespacePairing => [dbTagNamespacePairing.Tags_Namespaces_PK_Hash, dbTagNamespacePairing]));
    
    const tagNamespacePairingInsertionParams = [];
    for (const tagNamespacePairingWithHash of tagNamespacePairingsWithHash) {
        if (dbTagNamespacePairingsMap.has(tagNamespacePairingWithHash.Tags_Namespaces_PK_Hash)) {
            continue;
        }

        tagNamespacePairingInsertionParams.push(Number(tagNamespacePairingWithHash.Tag_ID));
        tagNamespacePairingInsertionParams.push(tagNamespacePairingWithHash.Namespace_ID);
        tagNamespacePairingInsertionParams.push(tagNamespacePairingWithHash.Tags_Namespaces_PK_Hash);
    }
    
    /** @type {DBTagNamespacePairing[]} */
    let insertedDBTagNamespacePairings = [];
    if (tagNamespacePairingInsertionParams.length !== 0) {
        insertedDBTagNamespacePairings = await dball(dbs, `
            INSERT INTO Tags_Namespaces(
                Tag_ID,
                Namespace_ID,
                Tags_Namespaces_PK_Hash
            ) VALUES ${dbtuples(tagNamespacePairingInsertionParams.length / 3, 3)} RETURNING *;
            `, tagNamespacePairingInsertionParams
        );
    }

    return [...dbTagNamespacePairings, ...insertedDBTagNamespacePairings].map(dbTagNamespacePairing => ({
        ...dbTagNamespacePairing,
        Tag_ID: BigInt(dbTagNamespacePairing.Tag_ID)
    }));
}

/**
 * @param {string} fileExtension 
 */
export function normalizeFileExtension(fileExtension) {
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
export async function upsertFileExtensions(dbs, fileExtensions) {
    if (fileExtensions.length === 0) {
        return [];
    }
    fileExtensions = fileExtensions.map(normalizeFileExtension);

    /** @type {DBFileExtension[]} */
    const dbFileExtensions = await dball(dbs, `SELECT * FROM File_Extensions WHERE File_Extension IN ${dbvariablelist(fileExtensions.length)};`, fileExtensions);
    const dbFileExtensionsExisting = new Set(dbFileExtensions.map(dbFileExtension => dbFileExtension.File_Extension));
    const fileExtensionsToInsert = fileExtensions.filter(fileExtension => !dbFileExtensionsExisting.has(fileExtension));

    /** @type {DBFileExtension[]} */
    let insertedDBFileExtensions = []
    if (fileExtensionsToInsert.length !== 0) {
        const insertedHasFileExtensionTags = await insertLocalTags(dbs, fileExtensionsToInsert.map(fileExtension => ({
            Source_Name: "System generated",
            Display_Name: `system:has file extension:${fileExtension}`,
            Lookup_Name: `system:has file extension:${fileExtension}`
        })), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const fileExtensionInsertionParams = [];
        for (let i = 0; i < fileExtensionsToInsert.length; ++i) {
            fileExtensionInsertionParams.push(fileExtensionsToInsert[i]);
            fileExtensionInsertionParams.push(Number(insertedHasFileExtensionTags[i].Tag_ID));
        }

        insertedDBFileExtensions = await dball(dbs, `
            INSERT INTO File_Extensions(
                File_Extension,
                Has_File_Extension_Tag_ID
            ) VALUES ${dbtuples(fileExtensionsToInsert.length, 2)} RETURNING *;
            `, fileExtensionInsertionParams
        );
    }

    return [...dbFileExtensions, ...insertedDBFileExtensions].map(dbFileExtension => ({
        ...dbFileExtension,
        Has_File_Extension_Tag_ID: BigInt(dbFileExtension.Has_File_Extension_Tag_ID)
    }));
}

/**
 * @param {Databases} dbs
 * @param {string[]} namespaces 
 */
export async function upsertNamespaces(dbs, namespaces) {
    if (namespaces.length === 0) {
        return [];
    }

    /** @type {DBNamespace[]} */
    const dbNamespaces = await dball(dbs, `SELECT * FROM Namespaces WHERE Namespace_Name IN ${dbvariablelist(namespaces.length)};`, namespaces);
    const dbNamespacesExisting = new Set(dbNamespaces.map(dbNamespace => dbNamespace.Namespace_Name));
    const namespacesToInsert = namespaces.filter(namespace => !dbNamespacesExisting.has(namespace));

    /** @type {DBNamespace[]} */
    let insertedDBNamespaces = []
    if (namespacesToInsert.length !== 0) {
        insertedDBNamespaces = await dball(dbs, `
            INSERT INTO Namespaces(
                Namespace_Name
            ) VALUES ${dbtuples(namespacesToInsert.length, 1)} RETURNING *;
            `, namespacesToInsert
        );
    }

    return [...dbNamespaces, ...insertedDBNamespaces];
}

/**
 * @param {Databases} dbs
 * @param {string[]} urls 
 */
export async function upsertURLs(dbs, urls, localTagServiceID) {
    if (urls.length === 0) {
        return [];
    }

    /** @type {DBURL[]} */
    const dbURLs = await dball(dbs, `SELECT * FROM URLs WHERE URL IN ${dbvariablelist(urls.length)};`, urls);
    const dbURLsExisting = new Set(dbURLs.map(dbURL => dbURL.URL));
    const urlsToInsert = urls.filter(url => !dbURLsExisting.has(url));

    /** @type {DBURL[]} */
    let insertedDBURLs = [];
    if (urlsToInsert.length !== 0) {
        const insertedHasURLTags = await insertLocalTags(dbs, urlsToInsert.map(url => ({
            Source_Name: "System generated",
            Display_Name: `system:has url:${url}`,
            Lookup_Name: `system:has url:${url}`
        })), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const urlInsertionParams = [];
        for (let i = 0; i < urlsToInsert.length; ++i) {
            urlInsertionParams.push(urlsToInsert[i]);
            urlInsertionParams.push(Number(insertedHasURLTags[i].Tag_ID));
        }

        insertedDBURLs = await dball(dbs, `
            INSERT INTO URLs(
                URL,
                Has_URL_Tag_ID
            ) VALUES ${dbtuples(urlsToInsert.length, 2)} RETURNING *;
            `, urlInsertionParams
        );

    }

    return [...dbURLs, ...insertedDBURLs].map(dbURL => ({
        ...dbURL,
        Has_URL_Tag_ID: BigInt(dbURL.Has_URL_Tag_ID)
    }));
}

/**
 * @param {DBURL & {
 *     URL_Association: string
 * }} urlAssociation
 */
export function urlAssociationPKHash(urlAssociation) {
    return `${urlAssociation.URL_ID}\x01${urlAssociation.URL_Association}`;
}

/**
 * @param {Databases} dbs
 * @param {(DBURL & {
 *     URL_Association: string
 * })[]} urlAssociations
 */
export async function upsertURLAssociations(dbs, urlAssociations) {
    if (urlAssociations.length === 0) {
        return [];
    }

    const urlAssociationsWithHash = urlAssociations.map(urlAssociation => {
        const URL_Associations_PK_Hash = urlAssociationPKHash(urlAssociation);
        return {
            ...urlAssociation,
            URL_Associations_PK_Hash
        };
    });

    /** @type {DBURLAssociation[]} */
    const dbURLAssociations = await dball(dbs,
        `SELECT * FROM URL_Associations WHERE URL_Associations_PK_Hash IN ${dbvariablelist(urlAssociationsWithHash.length)};`,
        urlAssociationsWithHash.map(urlAssociationWithHash => urlAssociationWithHash.URL_Associations_PK_Hash)
    );
    const dbURLAssociationsMap = new Map(dbURLAssociations.map(dbURLAssociation => [dbURLAssociation.URL_Associations_PK_Hash, dbURLAssociation]));
    const urlAssociationsToInsert = urlAssociationsWithHash.filter(urlAssociationWithHash => !dbURLAssociationsMap.has(urlAssociationWithHash.URL_Associations_PK_Hash));

    /** @type {DBURLAssociation[]} */
    let insertedDBURLAssociations = [];
    if (urlAssociationsToInsert.length !== 0) {
        const insertedHasURLAssociationTags = await insertLocalTags(dbs, urlAssociationsToInsert.map(urlAssociation => ({
            Source_Name: "System generated",
            Display_Name: `system:has url with association:${urlAssociation.URL} with association ${urlAssociation.URL_Association}`,
            Lookup_Name: `system:has url with association:${urlAssociation.URL} with association ${urlAssociation.URL_Association}`
        })), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

        const urlAssociationInsertionParams = [];
        for (let i = 0; i < urlAssociationsToInsert.length; ++i) {
            urlAssociationInsertionParams.push(urlAssociationsToInsert[i].URL_ID);
            urlAssociationInsertionParams.push(urlAssociationsToInsert[i].URL_Association);
            urlAssociationInsertionParams.push(urlAssociationsToInsert[i].URL_Associations_PK_Hash);
            urlAssociationInsertionParams.push(Number(insertedHasURLAssociationTags[i].Tag_ID));
        }

        insertedDBURLAssociations = await dball(dbs, `
            INSERT INTO URL_Associations(
                URL_ID,
                URL_Association,
                URL_Associations_PK_Hash,
                Has_URL_With_Association_Tag_ID
            ) VALUES ${dbtuples(urlAssociationsToInsert.length, 4)} RETURNING *;
            `, urlAssociationInsertionParams
        );

    }

    return [
        ...urlAssociationsWithHash.filter(urlAssociationWithHash => dbURLAssociationsMap.has(urlAssociationWithHash.URL_Associations_PK_Hash)).map(urlAssociationWithHash => ({
            ...urlAssociationWithHash,
            ...dbURLAssociationsMap.get(urlAssociationWithHash.URL_Associations_PK_Hash)
        })),
        ...urlAssociationsToInsert.map((urlAssociationToInsert, i) => ({
            ...urlAssociationToInsert,
            ...insertedDBURLAssociations[i]
        }))
    ].map(urlAssociation => ({
        ...urlAssociation,
        Has_URL_With_Association_Tag_ID: BigInt(urlAssociation.Has_URL_With_Association_Tag_ID)
    }));
}