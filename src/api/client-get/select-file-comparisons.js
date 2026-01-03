import { fbjsonParse } from "../../client/js/client-util.js";

/** @import {DBFileComparison} from "../../db/duplicates.js" */

/**
 * @param {string=} fileCursor
 * @param {number} maxPerceptualHashDistance
 */
export default async function selectFileComparisons(fileCursor, maxPerceptualHashDistance) {
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

    /** @type {DBFileComparison[]} */
    const sanitizedResponse = await fbjsonParse(response);
    return sanitizedResponse;
}