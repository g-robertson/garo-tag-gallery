import { fbjsonParse } from "../../client/js/client-util.js";

export default async function getPartialUploadSelections() {
    const partialUploadSelections = await fetch("/api/get/partial-upload-selections");
    return fbjsonParse(partialUploadSelections);
}