import { createIncrementer, mapNullCoalesce } from "../client/js/client-util.js";

/** @import {ResettableCacheType} from "../client/js/fetch-cache.js" */

/**
 * @typedef {Object} TaskDetails
 * @property {number=} upcomingSubtasks
 * @property {string=} upcomingTaskName
 * @property {number=} remainingSubtasks
 * @property {ResettableCacheType[]} resetCachesAfter
 */

/**
 * @typedef {Object} ErrorDetails
 * @property {string} error
 * @property {boolean} errorKnown
 */

/**
 * @typedef {TaskDetails & ErrorDetails} JobDetails
 */

/**
 * @template TypeName, ItemType
 * @typedef {Object} AddressableItem
 * @property {TypeName} type
 * @property {ItemType} item
 * @property {boolean} addressed
 */

/** @typedef {AddressableItem<"error", ErrorDetails> | AddressableItem<"cacheReset", ResettableCacheType>} AddressableJobItem */

/**
 * @typedef {Object} ClientJob
 * @property {string} jobID
 * @property {string} jobName
 * @property {string} jobType
 * @property {string} taskName
 * @property {number} finishedSubtaskCount
 * @property {number} totalEstimatedSubtasks
 * @property {AddressableJobItem[]} addressableItems
 * 
 * @property {boolean} done
 */

const getJobID = createIncrementer();

export class Job {
    #jobID;
    #jobName;
    #jobType;
    #generator;
    #durationBetweenTasks;
    #totalEstimatedSubtasks;
    /** @type {AddressableJobItem[]} */
    #addressableItems = [];
    #finishedSubtaskCount = 0;
    #currentTaskName;
    #done = false;
    /** @type {((job: Job) => void)[]} */
    #onFinishCallbacks = [];

    /**
     * @param {{
     *     jobName: string
     *     jobType?: string
     *     durationBetweenTasks?: number
     *     totalEstimatedSubtasks?: number
     * }} param0
     * @param {() => AsyncGenerator<JobDetails, JobDetails>} generator 

     */
    constructor({
        jobName,
        jobType,
        durationBetweenTasks,
        totalEstimatedSubtasks,
    }, generator) {
        jobType ??= "Untyped";
        durationBetweenTasks ??= 100;
        totalEstimatedSubtasks ??= Job.UNKNOWN_SUBTASK_ESTIMATE;

        this.#generator = generator();
        this.#jobID = getJobID();
        this.#jobName = jobName;
        this.#jobType = jobType;
        this.#durationBetweenTasks = durationBetweenTasks;
        this.#totalEstimatedSubtasks = totalEstimatedSubtasks;
    }

    jobID() {
        return this.#jobID;
    }

    jobType() {
        return this.#jobType;
    }

    async execute() {
        let upcomingSubtasks = 0;
        let resetCachesAfter = [];
        do {
            let {value, done} = (await this.#generator.next());

            for (const resetCacheAfter of resetCachesAfter) {
                this.#addressableItems.push({
                    type: "cacheReset",
                    item: resetCacheAfter,
                    addressed: false
                });
            }
            this.#finishedSubtaskCount += upcomingSubtasks;
            if (value?.error !== undefined) {
                this.#addressableItems.push({
                    type: "error",
                    item: {
                        error: value.error,
                        errorKnown: value.errorKnown
                    },
                    addressed: false
                });
            }
            if (done || this.#done) {
                break;
            }

            resetCachesAfter = value.resetCachesAfter ?? [];
            if (value.remainingSubtasks !== undefined) {
                this.#totalEstimatedSubtasks = this.#finishedSubtaskCount + value.remainingSubtasks;
            }
            if (value.upcomingTaskName !== undefined) {
                this.#currentTaskName = value.upcomingTaskName;
            }
            if (value.upcomingSubtasks !== undefined) {
                upcomingSubtasks = value.upcomingSubtasks;
                if (this.#durationBetweenTasks !== 0) {
                    await new Promise(resolve => {
                        setTimeout(resolve, this.#durationBetweenTasks);
                    });
                }

            }
        } while (true);

        this.#totalEstimatedSubtasks = this.#finishedSubtaskCount;
        this.#done = true;

        for (const onFinishCallback of this.#onFinishCallbacks) {
            onFinishCallback(this);
        }
    }

    cancel() {
        this.#done = true;
    }

    isDone() {
        return this.#done;
    }

    /**
     * @param {(job: Job) => void} onFinish 
     */
    addOnFinishCallback(onFinish) {
        this.#onFinishCallbacks.push(onFinish);
    }

    /**
     * @param {number} itemIndex
     */
    addressItemIndex(itemIndex) {
        const addressableItem = this.#addressableItems[itemIndex];
        if (addressableItem === undefined) {
            console.log(`Addressable item index ${itemIndex} on job ${this.#jobID} was not found`);
            return;
        }
        addressableItem.addressed = true;
    }

    unaddressedItems() {
        return this.#addressableItems.filter(item => !item.addressed);
    }

    static UNKNOWN_SUBTASK_ESTIMATE = Infinity;

    toJSON() {
        return {
            jobID: this.#jobID,
            jobName: this.#jobName,
            jobType: this.#jobType,
            taskName: this.#currentTaskName,
            finishedSubtaskCount: this.#finishedSubtaskCount,
            totalEstimatedSubtasks: this.#totalEstimatedSubtasks,
            addressableItems: this.#addressableItems,
            done: this.#done
        };
    }
}

/** @template T */
export class JobManager {
    /** @type {Map<T, Map<string, Job>>} */
    #runnersJobs = new Map();

    /**
     * @param {T} runner 
     * @param {Job} job 
     */
    addJobToRunner(runner, job) {
        const runnerJobs = mapNullCoalesce(this.#runnersJobs, runner, new Map());
        job.addOnFinishCallback(job => {
            this.#removeJobIfDone(runner, job);
        });

        runnerJobs.set(job.jobID(), job);
        job.execute();
    }

    /**
     * @param {T} runner 
     * @param {Job} job 
     */
    #removeJobIfDone(runner, job) {
        const runnerJobs = mapNullCoalesce(this.#runnersJobs, runner, new Map());
        if (job.isDone() && job.unaddressedItems().length === 0) {
            runnerJobs.delete(job.jobID());
        }
    }

    /**
     * @param {T} runner
     * @param {number} jobID
     */
    cancelJobOnRunner(runner, jobID) {
        const runnerJobs = this.#runnersJobs.get(runner);
        if (runnerJobs === undefined) {
            return;
        }

        const job = runnerJobs.get(jobID);
        job.cancel();
    }

    /**
     * @param {T} runner
     * @param {number} jobID
     * @param {number[]} itemIndices
     */
    addressItemsOnRunner(runner, jobID, itemIndices) {
        const runnerJobs = this.#runnersJobs.get(runner);
        if (runnerJobs === undefined) {
            return;
        }

        const job = runnerJobs.get(jobID);
        for (const itemIndex of itemIndices) {
            job.addressItemIndex(itemIndex);
        }
        this.#removeJobIfDone(runner, job);
    }

    /**
     * @param {T} runner 
     */
    getJobsForRunner(runner) {
        const runnerJobs = this.#runnersJobs.get(runner);
        if (runnerJobs === undefined) {
            return [];
        }
        return [...runnerJobs.values()];
    }
}