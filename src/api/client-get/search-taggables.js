/** @import {ClientSearchQuery} from "../post/search-taggables.js" */

import { FetchCache, fjsonParse } from "../../client/js/client-util.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";

/**
 * @param {ClientSearchQuery} clientSearchQuery 
 * @param {number[]} localTagServiceIDs 
 */
function searchTaggablesHash(clientSearchQuery, localTagServiceIDs) {
    return `${JSON.stringify(clientSearchQuery)}\x02${localTagServiceIDs.join("\x01")}`;
}

/**
 * @param {ClientSearchQuery} clientSearchQuery 
 * @param {number[]} localTagServiceIDs 
 * @param {FetchCache} fetchCache
 */
export async function searchTaggables(clientSearchQuery, localTagServiceIDs, fetchCache) {
    const hash = searchTaggablesHash(clientSearchQuery, localTagServiceIDs);
    const searchTaggablesCache = fetchCache.cache("search-taggables");
    if (searchTaggablesCache.getStatus(hash) === "empty") {
        searchTaggablesCache.setAwaiting(hash);
        const response = await fetch("/api/post/search-taggables", {
            body: JSON.stringify({
                searchQuery: clientSearchQuery,
                localTagServiceIDs: localTagServiceIDs.filter(localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST"
        });
        
        searchTaggablesCache.set(hash, await fjsonParse(response));
    }

    /** @type {number[]} */
    const response = await searchTaggablesCache.get(hash);
    return response;
}