
/** @import {ClientJob} from "../db/job-manager.js" */
/** @import {ResettableCacheType} from "./js/fetch-cache.js" */
/** @import {JobsItemsIndices} from "../api/post/address-jobs-item-indices.js" */

import getActiveJobs from "../api/client-get/active-jobs.js";
import addressJobsItemIndices from "../api/client-get/address-jobs-item-indices.js";
import cancelJob from "../api/client-get/cancel-job.js";
import { FetchCache } from "./js/fetch-cache.js";

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
    #pingJobsTimeout;

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

        /** @type {Set<ResettableCacheType>} */
        const cacheResets = new Set();
        /** @type {JobsItemsIndices} */
        const jobsItemsIndicesAddressed = [];
        for (const job of this.#jobs) {
            /** @type {number[]} */
            const jobItemIndicesAddressed = [];
            for (let i = 0; i < job.addressableItems.length; ++i) {
                const addressableItem = job.addressableItems[i];
                if (addressableItem.type === "cacheReset" && !addressableItem.addressed) {
                    cacheResets.add(addressableItem.item);
                    jobItemIndicesAddressed.push(i);
                }
            }

            jobsItemsIndicesAddressed.push({
                jobID: job.jobID,
                jobItemIndices: jobItemIndicesAddressed
            });
        }

        for (const cacheReset of cacheResets) {
            FetchCache.Global().resetCacheType(cacheReset);
        }

        this.addressJobsItemsIndices(jobsItemsIndicesAddressed).then(() => {
            if (this.#jobs.length === 0) {
                clearTimeout(this.#pingJobsTimeout);
                this.#pingJobsTimeout = undefined;
            } else if (this.#pingJobsTimeout === undefined) {
                this.#pingJobsTimeout = setTimeout(async () => {
                    this.#pingJobsTimeout = undefined;
                    await this.refresh();
                }, 1000);
            }
        });
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
        if (jobToRemove.done && jobToRemove.addressableItems.filter(jobError => !jobError.addressed).length === 0) {
            this.#jobs = this.#jobs.filter(job => job.jobID !== jobToRemove.jobID);
            this.#minimizedJobIDs.delete(jobToRemove.jobID);
            return true;
        }

        return false;
    }
    
    /**
     * @param {ClientJob} jobToAddress
     * @param {number} jobItemIndex
     */
    async addressJobItemIndex(jobToAddress, jobItemIndex) {
        await this.addressJobItemIndices(jobToAddress, [jobItemIndex]);
    }

    /**
     * @param {ClientJob} jobToAddress
     * @param {number[] | number} jobItemIndices
     */
    async addressJobItemIndices(jobToAddress, jobItemIndices) {
        await this.addressJobsItemsIndices([{jobID: jobToAddress.jobID, jobItemIndices}]);
    }

    /**
     * @param {JobsItemsIndices} jobsItemsIndices
     */
    async addressJobsItemsIndices(jobsItemsIndices) {
        let jobsUpdated = false;

        await addressJobsItemIndices(jobsItemsIndices);
        for (const {jobID, jobItemIndices} of jobsItemsIndices) {
            const job = this.#jobs.find(job => job.jobID === jobID);
            for (const jobItemIndex of jobItemIndices) {
                job.addressableItems[jobItemIndex].addressed = true;
            }

            if (this.#removeJobIfDone(job)) {
                jobsUpdated = true;
            }
        }
        
        if (jobsUpdated) {
            this.#onJobsUpdate();
        }
    }

    /**
     * @param {ClientJob} jobToCancel
     */
    async cancelJob(jobToCancel) {
        await cancelJob(jobToCancel.jobID);
        jobToCancel.done = true;

        if (this.#removeJobIfDone(jobToAddress)) {
            this.#onJobsUpdate();
        }
    }
}