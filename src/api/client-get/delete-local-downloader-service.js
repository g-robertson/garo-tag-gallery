import { FetchCache } from "../../client/js/fetch-cache.js";
import { User } from "../../client/js/user.js";

/**
 * @param {number} localDownloaderServiceID
 */
export default async function deleteLocalDownloaderService(localDownloaderServiceID) {
    await fetch("/api/post/delete-local-downloader-service", {
        body: JSON.stringify({
            localDownloaderServiceID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    await User.refreshGlobal();
    FetchCache.Global().resetCacheType("downloaders");
}