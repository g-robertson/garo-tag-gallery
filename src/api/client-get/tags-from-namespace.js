import { fjsonParse } from "../../client/js/client-util.js";

/** @import {ClientTag} from "./tags-from-local-tag-services.js" */

/**
 * @param {number} namespaceID
 */
export default async function getTagsFromNamespaceID(namespaceID) {
    const response = await fetch("/api/post/tags-from-namespace", {
        body: JSON.stringify({
            namespaceID
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

    return tagsResponse;
}