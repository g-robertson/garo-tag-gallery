import { fbjsonParse } from "../../client/js/client-util.js";
/** @import {WantedFileField} from "../../db/cursor-manager.js" */

/**
 * @param {string=} fileCursor
 * @param {WantedFileField | WantedFileField[]} wantedFields
 */
export default async function reselectFiles(fileCursor, wantedFields) {
    const response = await fetch("/api/post/reselect-files", {
        body: JSON.stringify({
            fileCursor,
            wantedFields
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });

    const responseJson = fbjsonParse(response);
    return responseJson;
}