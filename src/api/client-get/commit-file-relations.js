/** @import {FileRelation} from "../zod-types.js" */

import { FetchCache } from "../../client/js/fetch-cache.js";

/**
 * @param {FileRelation[]} fileRelations
 */
export default async function commitFileRelations(fileRelations) {
    const response = await fetch("/api/post/commit-file-relations", {
        body: JSON.stringify({
            fileRelations,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });

    const responseText = await response.text();
    FetchCache.Global().resetCacheType("files");

    if (response.status !== 200) {
        throw responseText;
    } else {
        return true;
    }
}