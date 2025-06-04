import { fjsonParse } from "../../client/js/client-util.js";

export const NOT_A_PARTIAL_UPLOAD = "Not a partial upload";

export default async function getPartialUploadSelections() {
    const partialUploadSelections = await fetch("/api/get/partial-upload-selections");
    return fjsonParse(partialUploadSelections);
}