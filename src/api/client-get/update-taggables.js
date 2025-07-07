/** @import {ClientTag} from "../post/update-taggables.js" */

import { FetchCache } from "../../client/js/client-util.js";

/**
 * @param {number[]} taggableIDs 
 * @param {[number, ClientTag[]]} tagsToAdd
 * @param {[number, string[]]} tagsToRemove
 * @param {FetchCache} fetchCache
 */
export async function updateTaggables(taggableIDs, tagsToAdd, tagsToRemove, fetchCache) {
    await fetch("/api/post/update-taggables", {
        body: JSON.stringify({
            taggableIDs,
            tagsToAdd,
            tagsToRemove
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    fetchCache.regenerateTagsCache();
}