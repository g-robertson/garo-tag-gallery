import { fjsonParse } from "../../client/js/client-util.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { MODAL_PROPERTIES as CREATE_AGGREGATE_TAG_MODAL_PROPERTIES } from "../../client/modal/modals/create-aggregate-tag.jsx";

/**
 * @typedef {Object} ClientTag
 * @property {number} localTagID
 * @property {number} localTagServiceID
 * @property {string} tagName
 * @property {string} displayName
 * @property {string[]} namespaces
 * @property {number} tagCount
 * @property {{
 *     modalName: string
 * }=} modalTagInfo
 */

/**
 * @param {string} displayName
 * @param {string} modalName
 * @returns {ClientTag}
 */
function modalSystemClientTag(displayName, modalName) {
    return {
        localTagID: -1,
        localTagServiceID: 0,
        tagName: displayName,
        displayName: `system:${displayName}`,
        namespaces: ['system'],
        tagCount: Infinity,
        modalTagInfo: {
            modalName
        }
    }
}

/** @type {Map<number, ClientTag[]} */
const CACHED = new Map([
    [SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, [
        modalSystemClientTag("aggregate tags", CREATE_AGGREGATE_TAG_MODAL_PROPERTIES.modalName)
    ]]
]);

/**
 * @param {number[]} localTagServiceIDs
 */
export default async function getTagsFromLocalTagServiceIDs(localTagServiceIDs) {
    /** @type {number[]} */
    const localTagServiceIDsUncached = localTagServiceIDs.filter(localTagServiceID => !CACHED.has(localTagServiceID));
    if (localTagServiceIDsUncached.length !== 0) {
        const response = await fetch("/api/post/tags-from-local-tag-services", {
            body: JSON.stringify({
                localTagServiceIDs: localTagServiceIDsUncached
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST"
        });

        /** @type {ClientTag[]} */
        const tagsResponse = (await fjsonParse(response)).map(tag => ({
            localTagID: tag[0],
            localTagServiceID: tag[1],
            displayName: tag[2],
            tagName: tag[3],
            namespaces: tag[4],
            tagCount: tag[5]
        }));

        for (const localTagServiceID of localTagServiceIDsUncached) {
            CACHED.set(localTagServiceID, []);
        }
        for (const tag of tagsResponse) {
            CACHED.get(tag.localTagServiceID).push(tag);
        }
    }

    /** @type {ClientTag[]} */
    const clientTags = Array.prototype.concat(...localTagServiceIDs.map(localTagServiceID => CACHED.get(localTagServiceID)));
    return clientTags;
}