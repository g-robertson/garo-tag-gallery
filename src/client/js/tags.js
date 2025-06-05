import { randomID } from "./client-util.js";

export const SYSTEM_TAG_TYPE = 0xFF;
export const URL_TAG_TYPE = 0xFE;
export const URL_ASSOCIATION_TAG_TYPE = 0xFD;
export const FILE_EXTENSION_TAG_TYPE = 0xFC;
export const FILE_HASH_TAG_TYPE = 0xFB;
export const NORMAL_TAG_TAG_TYPE = 0x00;

/**
 * 
 * @param {bigint} Tag_ID 
 * @param {PreInsertTag} preInsertTag
 */
function createSystemTag(Tag_ID, preInsertTag) {
    return Object.freeze({
        Tag_ID,
        ...preInsertTag,
        Tags_PK_Hash: tagsPKHash(preInsertTag.Lookup_Name, preInsertTag.Source_Name)
    });
}

export const HAS_NOTES_TAG = createSystemTag(0n, {
    Source_Name: "System generated",
    Display_Name: "system:has notes",
    Lookup_Name: "system:has notes",
    Tag_Type: SYSTEM_TAG_TYPE,
    User_Editable: 0
});
export const HAS_URL_TAG = createSystemTag(1n, {
    Source_Name: "System generated",
    Display_Name: "system:has url",
    Lookup_Name: "system:has url",
    Tag_Type: SYSTEM_TAG_TYPE,
    User_Editable: 0
});
export const IS_FILE_TAG = createSystemTag(2n, {
    Source_Name: "System generated",
    Display_Name: "system:is file",
    Lookup_Name: "system:is file",
    Tag_Type: SYSTEM_TAG_TYPE,
    User_Editable: 0
});
export const LAST_SYSTEM_TAG = createSystemTag(0xFFFFn, {
    Source_Name: "System generated",
    Display_Name: "system:reserved:user should not see",
    Lookup_Name: randomID(64),
    Tag_Type: SYSTEM_TAG_TYPE,
    User_Editable: 0
});

/** @import {PreInsertTag} from "../../db/tags.js" */

/**
 * 
 * @param {string} tagName
 * @param {string} sourceName
 * @returns {PreInsertTag}
 */
export function normalPreInsertTag(tagName, sourceName, ) {
    return {
        Display_Name: tagName,
        Lookup_Name: tagName,
        Source_Name: sourceName,
        Tag_Type: NORMAL_TAG_TAG_TYPE,
        User_Editable: 1
    };
}


/**
 * @param {string} lookupName 
 * @param {string} sourceName 
 */
export function tagsPKHash(lookupName, sourceName) {
    return `${lookupName}\x01${sourceName}`;
}