
/** @import {ClientJob} from "../db/job-manager.js" */

import getActiveJobs from "../api/client-get/active-jobs.js";
import addressJobErrorIndex from "../api/client-get/address-job-error-index.js";
import cancelJob from "../api/client-get/cancel-job.js";
import { User } from "./js/user.js";

export class Jobs {
    /** @type {ClientJob[]} */
    #jobs = [];
    /** @type {(() => void)[]} */
    #onJobsUpdateCallbacks = [];
    /** @type {Set<string>} */
    #minimizedJobIDs = new Set();
    /** @type {(() => void)[]} */
    #onJobsMinimizedUpdateCallbacks = [];
    /** @type {NodeJS.Timeout} */
    #pingJobsInterval;

    static #Gl_Jobs = new Jobs();

    static Global() {
        return Jobs.#Gl_Jobs;
    }

    static async refreshGlobal() {
        await Jobs.Global().refresh();
    }

    async refresh() {
        const jobs = await getActiveJobs();
        this.setJobs(jobs);
    }

    get jobs() {
        return this.#jobs;
    }

    get nonMinimizedJobs() {
        return this.#jobs.filter(job => !this.#minimizedJobIDs.has(job.jobID) && !job.done);
    }

    #onJobsUpdate() {
        for (const callback of this.#onJobsUpdateCallbacks) {
            callback();
        }

        if (this.#jobs.length === 0) {
            clearInterval(this.#pingJobsInterval);
            this.#pingJobsInterval = undefined;
        } else if (this.#pingJobsInterval === undefined) {
            this.#pingJobsInterval = setInterval(async () => {
                await User.refreshGlobal();
                await this.refresh();
            }, 1000);
        }
    }
    
    /**
     * @param {() => void} onJobsUpdateCallback
     */
    addOnJobsUpdateCallback(onJobsUpdateCallback) {
        this.#onJobsUpdateCallbacks.push(onJobsUpdateCallback);
    }

    
    #onJobsMinimizedUpdate() {
        for (const callback of this.#onJobsMinimizedUpdateCallbacks) {
            callback();
        }
    }
    
    /**
     * @param {() => void} onJobsMinimizedUpdateCallback
     */
    addOnJobsMinimizedUpdateCallback(onJobsMinimizedUpdateCallback) {
        this.#onJobsMinimizedUpdateCallbacks.push(onJobsMinimizedUpdateCallback);
    }

    /**
     * @param {ClientJob[]} jobs 
     */
    setJobs(jobs) {
        this.#jobs = jobs;
        this.#onJobsUpdate();
    }

    /**
     * @param {ClientJob} job 
     */
    addJob(job) {
        this.#jobs.push(job);
        this.#onJobsUpdate();
    }

    /**
     * @param {ClientJob} job
     */
    minimizeJob(job) {
        this.#minimizedJobIDs.add(job.jobID);
        this.#onJobsMinimizedUpdate();
    }

    /**
     * @param {ClientJob} jobToRemove
     */
    #removeJobIfDone(jobToRemove) {
        if (jobToRemove.done && jobToRemove.errors.filter(jobError => !jobError.addressed).length === 0) {
            this.#jobs = this.#jobs.filter(job => job.jobID !== jobToRemove.jobID);
            this.#minimizedJobIDs.delete(jobToRemove.jobID);
        }
    }

    /**
     * @param {ClientJob} jobToAddress
     * @param {number} jobErrorIndex
     */
    async addressJobErrorIndex(jobToAddress, jobErrorIndex) {
        await addressJobErrorIndex(jobToAddress.jobID, jobErrorIndex);
        jobToAddress.errors[jobErrorIndex].addressed = true;
        this.#removeJobIfDone(jobToAddress);

        this.#onJobsUpdate();
    }

    /**
     * @param {ClientJob} jobToCancel
     */
    async cancelJob(jobToCancel) {
        await cancelJob(jobToCancel.jobID);
        jobToCancel.done = true;
        this.#removeJobIfDone(jobToAddress);

        this.#onJobsUpdate();
    }
}