import { fjsonParse } from "../../client/js/client-util.js";

/**
 * 
 * @param {string} partialUploadPath 
 * @returns {Promise<string[]>}
 */
export default async function getPartialUploadSelectionFragments(partialUploadPath) {
    const partialUploadSelectionFragments = await fetch(`/api/get/partial-upload-selection-fragments?partialUploadPath=${encodeURIComponent(partialUploadPath)}`);
    return await fjsonParse(partialUploadSelectionFragments);
}