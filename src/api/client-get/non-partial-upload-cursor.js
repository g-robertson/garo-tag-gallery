export const NOT_A_PARTIAL_UPLOAD = "Not a partial upload";

export default async function getNonPartialUploadCursor() {
    const nonPartialUploadCursorIDResponse = await fetch("/api/get/non-partial-upload-cursor");
    return await nonPartialUploadCursorIDResponse.text();
}