/** @import {ClientTag} from "../post/update-taggables.js" */

import { FetchCache } from "../../client/js/fetch-cache.js";

/**
 * @param {number[]} taggableIDs 
 * @param {[number, ClientTag[]]} tagsToAdd
 * @param {[number, string[]]} tagsToRemove
 */
export async function updateTaggables(taggableIDs, tagsToAdd, tagsToRemove) {
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
    FetchCache.Global().resetCacheType("tags");
    FetchCache.Global().resetCacheType("taggables");
}