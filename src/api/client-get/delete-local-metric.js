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
}