import { fbjsonParse } from "../../client/js/client-util.js";

/** @import {ClientJob} from "../../db/job-manager.js" */

export default async function getActiveJobs() {
    const activeJobsResponse= await fetch("/api/get/active-jobs");
    /** @type {ClientJob[]} */
    const activeJobs = await fbjsonParse(activeJobsResponse);
    return activeJobs;
}