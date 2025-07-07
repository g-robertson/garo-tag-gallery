import { randomID } from "./client-util.js";
import { createInLocalTaggableServiceLookupName, DEFAULT_LOCAL_TAGGABLE_SERVICE } from "./taggables.js";

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

export const SYSTEM_LOCAL_TAG_SERVICE = {
    Service_ID: 0,
    Local_Tag_Service_ID: 0,
    Service_Name: "System local tags"
};
export const DEFAULT_LOCAL_TAG_SERVICE = {
    Service_ID: 1,
    Local_Tag_Service_ID: 1,
    Service_Name: "Default local tags"
};

export const SYSTEM_GENERATED = "System generated";

export const HAS_NOTES_TAG = createSystemTag(0n, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: "system:has notes",
    Lookup_Name: "system:has notes",
});
export const HAS_URL_TAG = createSystemTag(1n, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: "system:has url",
    Lookup_Name: "system:has url"
});
export const IS_FILE_TAG = createSystemTag(2n, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: "system:is file",
    Lookup_Name: "system:is file"
});
export const IN_TRASH_TAG = createSystemTag(3n, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: "system:in trash",
    Lookup_Name: "system:in trash"
});
export const IN_DEFAULT_LOCAL_TAGGABLE_SERVICE_TAG = createSystemTag(0xFFFEn, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: `system:in local taggable service:${DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_Name}`,
    Lookup_Name: createInLocalTaggableServiceLookupName(DEFAULT_LOCAL_TAGGABLE_SERVICE.Local_Taggable_Service_ID)
});
export const LAST_SYSTEM_TAG = createSystemTag(0xFFFFn, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: "system:reserved:user should not see",
    Lookup_Name: randomID(64)
});

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
        if (clientSearchQuery.value.length === 1) {
            return clientSearchQueryToDisplayName(clientSearchQuery.value[0]);
        } else {
            return `(${clientSearchQuery.value.map(clientSearchQueryToDisplayName).join(' OR ')})`
        }
    } else if (clientSearchQuery.type === "intersect") {
        if (clientSearchQuery.value.length === 1) {
            return clientSearchQueryToDisplayName(clientSearchQuery.value[0]);
        } else {
            return `(${clientSearchQuery.value.map(clientSearchQueryToDisplayName).join(' AND ')})`
        }
    } else if (clientSearchQuery.type === "complement") {
        return `-${clientSearchQueryToDisplayName(clientSearchQuery.value)}`
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
        clientSearchQuery1 = clientSearchQuery1.value;
    }
    while (clientSearchQuery2.type === "complement") {
        clientSearchQuery2 = clientSearchQuery2.value;
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