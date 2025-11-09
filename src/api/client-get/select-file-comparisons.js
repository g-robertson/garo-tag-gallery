import { FetchCache, fbjsonParse } from "../../client/js/client-util.js";

/** @import {DBFileComparison} from "../../db/duplicates.js" */


/**
 * @param {string=} fileCursor
 * @param {number} maxPerceptualHashDistance
 */
function selectFileComparisonsHash(fileCursor, maxPerceptualHashDistance) {
    return `${fileCursor}\x02${maxPerceptualHashDistance}`;
}

/**
 * @param {string=} fileCursor
 * @param {number} maxPerceptualHashDistance
 * @param {FetchCache} fetchCache
 * @param {boolean=} forceNoCache
 */
export default async function selectFileComparisons(fileCursor, maxPerceptualHashDistance, fetchCache, forceNoCache) {
    forceNoCache ??= false;

    const hash = selectFileComparisonsHash(fileCursor, maxPerceptualHashDistance);
    const selectFileComparisonsCache = fetchCache.cache("select-file-comparisons");
    if (selectFileComparisonsCache.getStatus(hash) === "empty" || forceNoCache) {
        selectFileComparisonsCache.setAwaiting(hash);
        const response = await fetch("/api/post/select-file-comparisons", {
            body: JSON.stringify({
                fileCursor,
                maxPerceptualHashDistance
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST"
        });

        selectFileComparisonsCache.set(hash, (await fbjsonParse(response)));
    }

    /** @type {DBFileComparison[]} */
    const response = await selectFileComparisonsCache.get(hash);
    return response;
}