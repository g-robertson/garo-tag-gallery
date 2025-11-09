import { FetchCache, fbjsonParse } from "../../client/js/client-util.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { CREATE_AGGREGATE_TAG_MODAL_PROPERTIES } from "../../client/modal/modals/create-aggregate-tag.jsx";
import { CREATE_METRIC_TAG_MODAL_PROPERTIES } from "../../client/modal/modals/create-metric-tag.jsx";

/** @import {ClientSearchQuery} from "../post/search-taggables.js" */

/**
 * @typedef {(ClientSearchQuery | {
 *     type: "modalTag"
 *     modalTagInfo?: {
 *         modalName: string
 *     }
 * }) & {
 *     displayName: string
 *     tagName: string,
 *     namespaces: string[]
 *     tagCount: number
 * }} ClientQueryTag
 */

/**
 * @param {string} displayName
 * @param {string} modalName
 * @returns {ClientQueryTag}
 */
function modalSystemClientQueryTag(displayName, modalName) {
    return {
        type: "modalTag",
        localTagID: -1,
        tagName: displayName,
        displayName: `system:${displayName}`,
        namespaces: ['system'],
        tagCount: Infinity,
        modalTagInfo: {
            modalName
        }
    }
}

const SYSTEM_CLIENT_TAGS = [
    modalSystemClientQueryTag("aggregate tags", CREATE_AGGREGATE_TAG_MODAL_PROPERTIES.modalName),
    modalSystemClientQueryTag("metric", CREATE_METRIC_TAG_MODAL_PROPERTIES.modalName)
];

/**
 * @param {number[]} localTagServiceIDs
 * @param {number[]=} taggableIDs,
 */
function getTagsFromLocalTagServiceIDsHash(localTagServiceIDs, taggableCursor) {
    return `${localTagServiceIDs.join("\x01")}\x02${taggableCursor ?? ""}`;
}

/**
 * @param {number[]} localTagServiceIDs
 * @param {number[]=} taggableCursor
 * @param {FetchCache} fetchCache
 */
async function getTagsFromLocalTagServiceIDs_(localTagServiceIDs, taggableCursor, fetchCache) {
    const hash = getTagsFromLocalTagServiceIDsHash(localTagServiceIDs, taggableCursor);
    const tagsFromLocalTagServiceIDsCache = fetchCache.cache("tags-from-local-tag-services");
    if (tagsFromLocalTagServiceIDsCache.getStatus(hash) === "empty") {
        tagsFromLocalTagServiceIDsCache.setAwaiting(hash);
        const response = await fetch("/api/post/tags-from-local-tag-services", {
            body: JSON.stringify({
                localTagServiceIDs,
                taggableCursor
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST"
        });

        tagsFromLocalTagServiceIDsCache.set(hash, (await fbjsonParse(response)).map(tag => ({
            type: "tagByLookup",
            Lookup_Name: tag[0],
            displayName: tag[1],
            tagName: tag[0],
            namespaces: tag[2],
            tagCount: tag[3]
        })));
    }

    /** @type {ClientQueryTag[]} */
    const response = await tagsFromLocalTagServiceIDsCache.get(hash);
    return response;
}

/**
 * @param {number[]} localTagServiceIDs
 * @param {string=} taggableCursor
 * @param {FetchCache} fetchCache
 */
export default async function getTagsFromLocalTagServiceIDs(localTagServiceIDs, taggableCursor, fetchCache) {
    const tagsResponse = await getTagsFromLocalTagServiceIDs_(
        localTagServiceIDs.filter(localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID),
        taggableCursor,
        fetchCache
    );
    if (localTagServiceIDs.findIndex((localTagServiceID => localTagServiceID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID)) === -1) {
        return tagsResponse;
    } else {
        return SYSTEM_CLIENT_TAGS.concat(tagsResponse);
    }
}