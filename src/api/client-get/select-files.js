import { fbjsonParse } from "../../client/js/client-util.js";

/** @import {DBFile} from "../../db/taggables.js" */

/**
 * @param {number[]} fileIDs
 */
export default async function selectFiles(fileIDs) {
    const response = await fetch("/api/post/select-files", {
        body: JSON.stringify({
            fileIDs
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });

    /** @type {DBFile[]} */
    const sanitizedResponse = await fbjsonParse(response);
    return sanitizedResponse;
}