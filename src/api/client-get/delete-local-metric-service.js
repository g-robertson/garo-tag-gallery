import { FetchCache } from "../../client/js/fetch-cache.js";
import { User } from "../../client/js/user.js";

/**
 * @param {number} localMetricServiceID
 */
export default async function deleteLocalMetricService(localMetricServiceID) {
    await fetch("/api/post/delete-local-metric-service", {
        body: JSON.stringify({
            localMetricServiceID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    await User.refreshGlobal();
    FetchCache.Global().resetCacheType("metrics");
}