/**
 * @param {string} partialUploadSelection
 * @param {File} file
 * @param {string=} pathCursorID
 */
export default async function postPartialFile(partialUploadSelection, file, pathCursorID) {
    const formData = new FormData();
    formData.append("partialUploadSelection", partialUploadSelection);
    formData.append("file", file, file.name);
    formData.append("pathCursorID", pathCursorID);
    return await fetch("/api/post/partial-file", {
        body: formData,
        method: "POST"
    });
}