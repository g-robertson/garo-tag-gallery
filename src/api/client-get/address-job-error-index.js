/**
 * @param {number} jobID
 * @param {number} jobErrorIndex
 */
export default async function addressJobErrorIndex(jobID, jobErrorIndex) {
    await fetch("/api/post/address-job-error-index", {
        body: JSON.stringify({
            jobID,
            jobErrorIndex
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}