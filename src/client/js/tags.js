import { randomID } from "./client-util.js";

/**
 * 
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

export const HAS_NOTES_TAG = createSystemTag(0n, {
    Source_Name: "System generated",
    Display_Name: "system:has notes",
    Lookup_Name: "system:has notes",
});
export const HAS_URL_TAG = createSystemTag(1n, {
    Source_Name: "System generated",
    Display_Name: "system:has url",
    Lookup_Name: "system:has url"
});
export const IS_FILE_TAG = createSystemTag(2n, {
    Source_Name: "System generated",
    Display_Name: "system:is file",
    Lookup_Name: "system:is file"
});
export const LAST_SYSTEM_TAG = createSystemTag(0xFFFFn, {
    Source_Name: "System generated",
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
 * @param {string} lookupName 
 * @param {string} sourceName 
 */
export function localTagsPKHash(lookupName, sourceName) {
    return `${lookupName}\x01${sourceName}`;
}