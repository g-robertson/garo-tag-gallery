import { FetchCache } from "../../client/js/fetch-cache.js";
import { User } from "../../client/js/user.js";

/**
 * @param {number} localTaggableServiceID
 */
export default async function deleteLocalTaggableService(localTaggableServiceID) {
    await fetch("/api/post/delete-local-taggable-service", {
        body: JSON.stringify({
            localTaggableServiceID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    await User.refreshGlobal();
    FetchCache.Global().resetCacheType("taggables");
}