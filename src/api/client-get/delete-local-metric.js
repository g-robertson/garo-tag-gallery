import { FetchCache } from "../../client/js/fetch-cache.js";
import { User } from "../../client/js/user.js";

/**
 * @param {number} localMetricID
 */
export default async function deleteLocalMetric(localMetricID) {
    await fetch("/api/post/delete-local-metric", {
        body: JSON.stringify({
            localMetricID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
    await User.refreshGlobal();
    FetchCache.Global().resetCacheType("metrics");
}