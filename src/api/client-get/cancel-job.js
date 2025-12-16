/**
 * @param {number} jobID
 */
export default async function cancelJob(jobID) {
    await fetch("/api/post/cancel-job", {
        body: JSON.stringify({
            jobID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}