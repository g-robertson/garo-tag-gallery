/**
 * @param {number} localTaggableServiceID 
 */
export function createInLocalTaggableServiceLookupName(localTaggableServiceID) {
    return `system:in local taggable service:${localTaggableServiceID}`;
}

/**
 * @param {string} lookupName 
 */
export function isInLocalTaggableServiceLookupName(lookupName) {
    return lookupName.startsWith("system:in local taggable service:");
}

/**
 * @param {string} lookupName 
 */
export function revertInLocalTaggableServiceLookupName(lookupName) {
    return Number(lookupName.slice("system:in local taggable service:".length));
}

export const DEFAULT_LOCAL_TAGGABLE_SERVICE = {
    Service_ID: 2,
    Local_Taggable_Service_ID: 0,
    Service_Name: "Default local taggables",
    In_Local_Taggable_Service_Tag_ID: 3n
};
