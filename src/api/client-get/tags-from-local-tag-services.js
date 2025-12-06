import { fbjsonParse } from "../../client/js/client-util.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import CreateAggregateTag from "../../client/modal/modals/create-aggregate-tag.jsx";
import CreateMetricTag from "../../client/modal/modals/create-metric-tag.jsx";

/** @import {Modal} from "../../client/modal/modals.js" */
/** @import {ClientSearchQuery} from "../post/search-taggables.js" */

/**
 * @typedef {(ClientSearchQuery | {
 *     type: "modalTag"
 *     modalTagInfo?: {
 *         modalType: string
 *     }
 * }) & {
 *     displayName: string
 *     tagName: string,
 *     namespaces: string[]
 *     tagCount: number
 *     localTagServiceIDs: number[]
 * }} ClientQueryTag
 */

/**
 * @param {string} displayName
 * @param {() => Modal} modal
 * @returns {ClientQueryTag}
 */
function modalSystemClientQueryTag(displayName, modal) {
    return {
        type: "modalTag",
        localTagID: -1,
        tagName: displayName,
        displayName: `system:${displayName}`,
        namespaces: ['system'],
        tagCount: Infinity,
        localTagServiceIDs: [SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID],
        modalTagInfo: {
            modal
        }
    }
}

const SYSTEM_CLIENT_TAGS = [
    modalSystemClientQueryTag("aggregate tags", CreateAggregateTag),
    modalSystemClientQueryTag("metric", CreateMetricTag)
];


/**
 * @param {number[]} localTagServiceIDs
 * @param {string=} taggableCursor
 * @param {number[]=} taggableIDs
 */
async function getTagsFromLocalTagServiceIDs_(localTagServiceIDs, taggableCursor, taggableIDs) {
    const response = await fetch("/api/post/tags-from-local-tag-services", {
        body: JSON.stringify({
            localTagServiceIDs,
            taggableCursor,
            taggableIDs
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });

    /** @type {ClientQueryTag[]} */
    const sanitizedResponse = (await fbjsonParse(response)).map(tag => ({
        type: "tagByLookup",
        Lookup_Name: tag[0],
        displayName: tag[1],
        tagName: tag[0],
        namespaces: tag[2],
        tagCount: tag[3],
        localTagServiceIDs: tag[4]
    }));
    return sanitizedResponse;
}

/**
 * @param {number[]} localTagServiceIDs
 * @param {string=} taggableCursor
 * @param {number[]=} taggableIDs
 */
export default async function getTagsFromLocalTagServiceIDs(localTagServiceIDs, taggableCursor, taggableIDs) {
    const tagsResponse = await getTagsFromLocalTagServiceIDs_(
        localTagServiceIDs.filter(localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID),
        taggableCursor,
        taggableIDs
    );
    if (!localTagServiceIDs.some((localTagServiceID => localTagServiceID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID))) {
        return tagsResponse;
    } else {
        return SYSTEM_CLIENT_TAGS.concat(tagsResponse);
    }
}