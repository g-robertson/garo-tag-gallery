/** @import {ClientSearchQuery, WantedCursor, SearchWantedField} from "../post/search-taggables.js" */

import { fbjsonParse } from "../../client/js/client-util.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";


/**
 * @param {ClientSearchQuery} clientSearchQuery
 * @param {WantedCursor} wantedCursor
 * @param {SearchWantedField | SearchWantedField[]} wantedFields
 * @param {number[]} localTagServiceIDs
 */
export async function searchTaggables(clientSearchQuery, wantedCursor, wantedFields, localTagServiceIDs) {
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
    
    /**
     * @type {{
     *   cursor: string
     *   result: any
     * }}
     **/
    const sanitizedResponse = await fbjsonParse(response);
    return sanitizedResponse;
}