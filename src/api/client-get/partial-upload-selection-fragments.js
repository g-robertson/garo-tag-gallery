import { fjsonParse } from "../../client/js/client-util.js";

/**
 * 
 * @param {string} partialUploadFolder 
 * @returns {Promise<string[]>}
 */
export default async function getPartialUploadSelectionFragments(partialUploadFolder) {
    const partialUploadSelectionFragments = await fetch(`/api/get/partial-upload-selection-fragments?partialUploadFolder=${encodeURIComponent(partialUploadFolder)}`);
    return await fjsonParse(partialUploadSelectionFragments);
}