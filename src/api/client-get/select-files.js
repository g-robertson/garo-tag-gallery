import { fbjsonParse } from "../../client/js/client-util.js";
import { FetchCache } from "../../client/js/fetch-cache.js";

/** @import {DBFile} from "../../db/taggables.js" */

/**
 * @param {number[]} fileIDs
 */
function selectFilesHash(fileIDs) {
    return `${fileIDs.join("\x01")}`;
}

/**
 * @param {number[]} fileIDs
 * @param {boolean=} forceNoCache
 */
export default async function selectFiles(fileIDs, forceNoCache) {
    forceNoCache ??= false;

    const hash = selectFilesHash(fileIDs);
    const selectFilesCache = FetchCache.Global().cache("select-files");
    if (selectFilesCache.getStatus(hash) === "empty" || forceNoCache) {
        selectFilesCache.setAwaiting(hash);
        const response = await fetch("/api/post/select-files", {
            body: JSON.stringify({
                fileIDs
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST"
        });

        selectFilesCache.set(hash, (await fbjsonParse(response)));
    }

    /** @type {DBFile[]} */
    const response = await selectFilesCache.get(hash);
    return response;
}