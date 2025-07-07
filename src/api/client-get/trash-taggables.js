/** @import {ClientTag} from "../post/update-taggables.js" */

import { FetchCache } from "../../client/js/client-util.js";

/**
 * @param {number[]} taggableIDs
 * @param {FetchCache} fetchCache
 */
export async function trashTaggables(taggableIDs, fetchCache) {
    await fetch("/api/post/trash-taggables", {
        body: JSON.stringify({
            taggableIDs
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    fetchCache.regenerateTagsCache();
}