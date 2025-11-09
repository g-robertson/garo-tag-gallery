import { FetchCache, fbjsonParse } from "../../client/js/client-util.js";

/** @import {DBFile} from "../../db/taggables.js" */

/**
 * @param {number[]} fileIDs
 */
function selectFilesHash(fileIDs) {
    return `${fileIDs.join("\x01")}`;
}

/**
 * @param {number[]} fileIDs
 * @param {FetchCache} fetchCache
 * @param {boolean=} forceNoCache
 */
export default async function selectFiles(fileIDs, fetchCache, forceNoCache) {
    forceNoCache ??= false;

    const hash = selectFilesHash(fileIDs);
    const selectFilesCache = fetchCache.cache("select-files");
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