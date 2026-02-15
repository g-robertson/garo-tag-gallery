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