import { fjsonParse } from "../../client/js/client-util.js";

/** @import {ClientTag} from "../post/update-taggables.js" */

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
        tagName: tag[0],
        displayName: tag[1],
        namespaces: tag[2],
        tagCount: tag[3]
    }));

    return tagsResponse;
}