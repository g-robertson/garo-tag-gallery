/** @import {JobsItemsIndices} from "../post/address-jobs-item-indices.js" */

/**
 * @param {JobsItemsIndices} jobsItemsIndices
 */
export default async function addressJobsItemIndices(jobsItemsIndices) {
    jobsItemsIndices = jobsItemsIndices.filter(({jobItemIndices}) => jobItemIndices.length !== 0);

    if (jobsItemsIndices.length === 0) {
        return;
    }

    await fetch("/api/post/address-jobs-item-indices", {
        body: JSON.stringify({
            jobsItemsIndices
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}