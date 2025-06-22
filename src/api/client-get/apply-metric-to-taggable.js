/**
 * @param {number} taggableID 
 * @param {number} localMetricID 
 * @param {number} metricValue 
 */
export default async function applyMetricToTaggable(taggableID, localMetricID, metricValue) {
    await fetch("/api/post/apply-metric-to-taggable", {
        body: JSON.stringify({
            taggableID,
            localMetricID,
            metricValue
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}