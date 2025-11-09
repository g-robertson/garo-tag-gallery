import { NO_FILE_CURSOR_FOUND } from "../../client/js/cursor.js";

/**
 * @param {string=} fileCursor
 */
export default async function compareFilesForDuplicates(fileCursor) {
    const response = await fetch("/api/post/compare-files-for-duplicates", {
        body: JSON.stringify({
            fileCursor,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });

    const responseText = await response.text();

    if (responseText === NO_FILE_CURSOR_FOUND) {
        return false;
    } else if (response.status !== 200) {
        throw responseText;
    } else {
        return true;
    }
}