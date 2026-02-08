import { FetchCache } from "../../client/js/fetch-cache.js";
import { User } from "../../client/js/user.js";

/**
 * @param {number} localTagServiceID
 */
export default async function deleteLocalTagService(localTagServiceID) {
    await fetch("/api/post/delete-local-tag-service", {
        body: JSON.stringify({
            localTagServiceID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    await User.refreshGlobal();
    FetchCache.Global().resetCacheType("tags");
}