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
}