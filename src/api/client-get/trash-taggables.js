/** @import {ClientTag} from "../post/update-tags-on-taggables.js" */

import { FetchCache } from "../../client/js/fetch-cache.js";

/**
 * @param {number[]} taggableIDs
 */
export async function trashTaggables(taggableIDs) {
    await fetch("/api/post/trash-taggables", {
        body: JSON.stringify({
            taggableIDs
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    FetchCache.Global().resetCacheType("tags");
    FetchCache.Global().resetCacheType("taggables");
}