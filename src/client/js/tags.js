/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */

/**
 * @param {bigint} Tag_ID 
 * @param {PreInsertLocalTag} preInsertLocalTag
 */
export function createSystemTag(Tag_ID, preInsertLocalTag) {
    return Object.freeze({
        Tag_ID,
        ...preInsertLocalTag,
        Tags_PK_Hash: localTagsPKHash(preInsertLocalTag.Lookup_Name, preInsertLocalTag.Source_Name)
    });
}

export const SYSTEM_GENERATED = "System generated";

/** @import {PreInsertLocalTag} from "../../db/tags.js" */

/**
 * 
 * @param {string} tagName
 * @param {string} Source_Name
 * @returns {PreInsertLocalTag}
 */
export function normalPreInsertLocalTag(tagName, Source_Name) {
    return {
        Display_Name: tagName,
        Lookup_Name: tagName,
        Source_Name,
    };
}

/**
 * @param {string} lookupName 
 */
export function mapLookupNameToPreInsertSystemTag(lookupName) {
    return normalPreInsertLocalTag(lookupName, SYSTEM_GENERATED);
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
 * @param {string} fileExtension 
 */
export function createFileExtensionLookupName(fileExtension) {
    fileExtension = normalizeFileExtension(fileExtension);
    return `system:has file extension:${fileExtension}`;
}

/**
 * @param {string} fileHash 
 */
export function createHasFileHashLookupName(fileHash) {
    fileHash = fileHash.toLowerCase();
    return `system:has file hash:${fileHash}`;
}

/**
 * @param {string} url 
 */
export function createHasURLTagLookupName(url) {
    return `system:has url:${url}`;
}

/**
 * @typedef {Object} URLAssociation
 * @property {string} URL
 * @property {string} URL_Association
 */

/**
 * @param {URLAssociation} urlAssocation 
 */
export function createURLAssociationTagLookupName(urlAssociation) {
    // " with with " => URL = " with"
    // " with with " => URL = "" URL_Association = "with "
    return `system:has url with association:${urlAssociation.URL} with\x01 ${urlAssociation.URL_Association}`;
}

/**
 * @param {string} lookupName 
 */
export function isURLAssociationTagLookupName(lookupName) {
    return lookupName.startsWith("system:has url with association:");
}

/**
 * @param {string} lookupName 
 */
export function revertURLAssociationTagLookupName(lookupName) {
    const parts = lookupName.slice("system:has url with association:".length).split(" with\x01 ");
    return {
        URL: parts[0],
        URL_Association: parts[1]
    };
}

/**
 * @param {string} lookupName 
 * @param {string} sourceName 
 */
export function localTagsPKHash(lookupName, sourceName) {
    return `${lookupName}\x01${sourceName}`;
}

/**
 * @param {ClientSearchQuery} clientSearchQuery 
 * @returns {string}
 */
export function clientSearchQueryToDisplayName(clientSearchQuery) {
    if (clientSearchQuery.type === "union") {
        if (clientSearchQuery.expressions.length === 1) {
            return clientSearchQueryToDisplayName(clientSearchQuery.expressions[0]);
        } else {
            return `(${clientSearchQuery.expressions.map(clientSearchQueryToDisplayName).join(' OR ')})`
        }
    } else if (clientSearchQuery.type === "intersect") {
        if (clientSearchQuery.expressions.length === 1) {
            return clientSearchQueryToDisplayName(clientSearchQuery.expressions[0]);
        } else {
            return `(${clientSearchQuery.expressions.map(clientSearchQueryToDisplayName).join(' AND ')})`
        }
    } else if (clientSearchQuery.type === "complement") {
        return `-${clientSearchQueryToDisplayName(clientSearchQuery.expression)}`
    } else {
        return clientSearchQuery.displayName;
    }
}

/**
 * @param {ClientSearchQuery} clientSearchQuery1
 * @param {ClientSearchQuery} clientSearchQuery2
 */
export function isConflictingClientSearchQuery(clientSearchQuery1, clientSearchQuery2) {
    while (clientSearchQuery1.type === "complement") {
        clientSearchQuery1 = clientSearchQuery1.expression;
    }
    while (clientSearchQuery2.type === "complement") {
        clientSearchQuery2 = clientSearchQuery2.expression;
    }

    if (clientSearchQuery1.type !== clientSearchQuery2.type) {
        return false;
    }

    if (clientSearchQuery1.type === "tagByLocalTagID") {
        return clientSearchQuery1.localTagID === clientSearchQuery2.localTagID;
    } else if (clientSearchQuery1.type === "tagByLookup") {
        return clientSearchQuery1.Lookup_Name === clientSearchQuery2.Lookup_Name;
    }
}