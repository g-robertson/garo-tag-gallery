/** @import {ClientSearchQuery, WantedCursor, SearchWantedField} from "../post/search-taggables.js" */

import { fbjsonParse } from "../../client/js/client-util.js";
import { FetchCache } from "../../client/js/fetch-cache.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";

/**
 * @param {ClientSearchQuery} clientSearchQuery 
 * @param {WantedCursor} wantedCursor
 * @param {SearchWantedField | SearchWantedField[]} wantedFields
 * @param {number[]} localTagServiceIDs 
 */
function searchTaggablesHash(clientSearchQuery, wantedCursor, wantedFields, localTagServiceIDs) {
    return `${JSON.stringify(clientSearchQuery)}\x02${wantedCursor}\x02${JSON.stringify(wantedFields)}\x02${localTagServiceIDs.join("\x01")}`;
}

/**
 * @param {ClientSearchQuery} clientSearchQuery
 * @param {WantedCursor} wantedCursor
 * @param {SearchWantedField | SearchWantedField[]} wantedFields
 * @param {number[]} localTagServiceIDs
 * @param {boolean=} forceNoCache
 * @returns {Promise<{
 *   cursor: string
 *   result: any
 * }>}
 */
export async function searchTaggables(clientSearchQuery, wantedCursor, wantedFields, localTagServiceIDs, forceNoCache) {
    forceNoCache ??= false;

    const hash = searchTaggablesHash(clientSearchQuery, wantedCursor, wantedFields, localTagServiceIDs);
    const searchTaggablesCache = FetchCache.Global().cache("search-taggables");
    if (searchTaggablesCache.getStatus(hash) === "empty" || forceNoCache) {
        searchTaggablesCache.setAwaiting(hash);
        const response = await fetch("/api/post/search-taggables", {
            body: JSON.stringify({
                searchQuery: clientSearchQuery,
                wantedCursor,
                wantedFields,
                localTagServiceIDs: localTagServiceIDs.filter(localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST"
        });
        
        searchTaggablesCache.set(hash, await fbjsonParse(response));
    }

    /** @type {number[]} */
    const response = await searchTaggablesCache.get(hash);
    return response;
}