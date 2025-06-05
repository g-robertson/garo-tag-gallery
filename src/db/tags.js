import { FILE_EXTENSION_TAG_TYPE, tagsPKHash, URL_ASSOCIATION_TAG_TYPE, URL_TAG_TYPE } from "../client/js/tags.js";
import {asyncDataSlicer, dball, dbsqlcommand, dbtuples, dbvariablelist} from "./db-util.js";

/** @import {Databases} from "./db-util.js" */

/**
 * @param {DBTag} systemTag 
 */
export function insertsystemtag(systemTag) {
    return dbsqlcommand(`
        INSERT INTO Tags(
            Tag_ID,
            Display_Name,
            Lookup_Name,
            Tag_Type,
            User_Editable,
            Tags_PK_Hash
        ) VALUES (
            $systemTagID,
            $systemTagDisplayName,
            $systemTagLookupName,
            $systemTagType,
            0,
            $systemTagPKHash
        );
    `, {
        $systemTagID: Number(systemTag.Tag_ID),
        $systemTagDisplayName: systemTag.Display_Name,
        $systemTagLookupName: systemTag.Lookup_Name,
        $systemTagType: systemTag.Tag_Type,
        $systemTagPKHash: systemTag.Tags_PK_Hash
    });
}

/**
 * @typedef {Object} PreInsertTag
 * @property {string} Source_Name
 * @property {string} Display_Name
 * @property {string} Lookup_Name
 * @property {number} Tag_Type
 * @property {number} User_Editable
 */

/**
 * @typedef {Object} DBTag
 * @property {bigint} Tag_ID
 * @property {string} Source_Name
 * @property {string} Tags_PK_Hash
 * @property {string} Display_Name
 * @property {string} Lookup_Name
 * @property {string} Tag_Type
 * @property {string} User_Editable
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
 * 
 * @param {Databases} dbs 
 * @param {{Lookup_Name: string, Source_Name: string}[]} tagLookups 
 */
async function selectTags(dbs, tagLookups) {
    if (tagLookups.length === 0) {
        return [];
    }

    const tagPKHashes = tagLookups.map(tagLookup => tagsPKHash(tagLookup.Lookup_Name, tagLookup.Source_Name));

    /** @type {DBTag[]} */
    const dbTags = await dball(dbs, `SELECT * FROM Tags WHERE Tags_PK_Hash IN ${dbvariablelist(tagPKHashes.length)};`, tagPKHashes);
    return dbTags.map(dbTag => ({
        ...dbTag,
        Tag_ID: BigInt(dbTag.Tag_ID)
    }));
}

/**
 * @param {Databases} dbs 
 * @param {PreInsertTag[]} tags 
 * @returns {Promise<DBTag[]>}
 */
async function insertTags(dbs, tags) {
    if (tags.length === 0) {
        return [];
    }
    if (tags.length > 2000) {
        return (await asyncDataSlicer(tags, 2000, sliced => insertTags(dbs, sliced))).flat();
    }
    
    const tagInsertionParams = [];
    for (const tag of tags) {
        tagInsertionParams.push(tag.Source_Name);
        tagInsertionParams.push(tag.Display_Name);
        tagInsertionParams.push(tag.Lookup_Name);
        tagInsertionParams.push(tag.Tag_Type);
        tagInsertionParams.push(tag.User_Editable);
        tagInsertionParams.push(tagsPKHash(tag.Lookup_Name, tag.Source_Name));
    }

    /** @type {DBTag[]} */
    const dbTags = await dball(dbs, `
        INSERT INTO Tags(
            Source_Name,
            Display_Name,
            Lookup_Name,
            Tag_Type,
            User_Editable,
            Tags_PK_Hash
        ) VALUES ${dbtuples(tags.length, 6)} RETURNING *;
        `, tagInsertionParams
    );
    return dbTags.map(dbTag => ({
        ...dbTag,
        Tag_ID: BigInt(dbTag.Tag_ID)
    }));
}

/**
 * @param {Databases} dbs 
 * @param {PreInsertTag[]} tags 
 */
export async function upsertTags(dbs, tags) {
    if (tags.length === 0) {
        return [];
    }

    const dbTags = await selectTags(dbs, tags);
    const dbTagsExisting = new Set(dbTags.map(dbTag => dbTag.Lookup_Name));
    const tagsToInsert = tags.filter(tag => !dbTagsExisting.has(tag.Lookup_Name));
    const insertedDBTags = await insertTags(dbs, tagsToInsert); 

    return [...dbTags, ...insertedDBTags];
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
 * @param {Databases} dbs
 * @param {string[]} fileExtensions 
 */
export async function upsertFileExtensions(dbs, fileExtensions) {
    if (fileExtensions.length === 0) {
        return [];
    }

    /** @type {DBFileExtension[]} */
    const dbFileExtensions = await dball(dbs, `SELECT * FROM File_Extensions WHERE File_Extension IN ${dbvariablelist(fileExtensions.length)};`, fileExtensions);
    const dbFileExtensionsExisting = new Set(dbFileExtensions.map(dbFileExtension => dbFileExtension.File_Extension));
    const fileExtensionsToInsert = fileExtensions.filter(fileExtension => !dbFileExtensionsExisting.has(fileExtension));

    /** @type {DBFileExtension[]} */
    let insertedDBFileExtensions = []
    if (fileExtensionsToInsert.length !== 0) {
        const insertedHasFileExtensionTags = await insertTags(dbs, fileExtensionsToInsert.map(fileExtension => ({
            Source_Name: "System generated",
            Display_Name: `system:has file extension:${fileExtension}`,
            Lookup_Name: `system:has file extension:${fileExtension}`,
            Tag_Type: FILE_EXTENSION_TAG_TYPE,
            User_Editable: 0
        })));

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
export async function upsertURLs(dbs, urls) {
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
        const insertedHasURLTags = await insertTags(dbs, urlsToInsert.map(url => ({
            Source_Name: "System generated",
            Display_Name: `system:has url:${url}`,
            Lookup_Name: `system:has url:${url}`,
            Tag_Type: URL_TAG_TYPE,
            User_Editable: 0
        })));

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
        const insertedHasURLAssociationTags = await insertTags(dbs, urlAssociationsToInsert.map(urlAssociation => ({
            Source_Name: "System generated",
            Display_Name: `system:has url with association:${urlAssociation.URL} with association ${urlAssociation.URL_Association}`,
            Lookup_Name: `system:has url with association:${urlAssociation.URL} with association ${urlAssociation.URL_Association}`,
            Tag_Type: URL_ASSOCIATION_TAG_TYPE,
            User_Editable: 0
        })));

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