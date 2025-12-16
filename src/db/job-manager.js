/**
 * @typedef {Object} TaskDetails
 * @property {number=} upcomingSubtasks
 * @property {string=} upcomingTaskName
 * @property {number=} remainingSubtasks
 */

/**
 * @typedef {Object} ErrorDetails
 * @property {string} error
 * @property {boolean} errorKnown
 * @property {boolean} addressed
 */

/**
 * @typedef {TaskDetails & ErrorDetails} JobDetails
 */

/**
 * @typedef {Object} ClientJob
 * @property {string} jobID
 * @property {string} jobName
 * @property {string} jobType
 * @property {string} taskName
 * @property {number} finishedSubtaskCount
 * @property {number} totalEstimatedSubtasks
 * @property {ErrorDetails[]} errors
 * @property {boolean} done
 */

const getJobID = (() => {
    let currentJobID = 0;
    return () => {
        return ++currentJobID;
    };
})();

import { mapNullCoalesce } from "../client/js/client-util.js";

export class Job {
    #jobID;
    #jobName;
    #jobType;
    #generator;
    #durationBetweenTasks;
    #totalEstimatedSubtasks;
    /** @type {ErrorDetails[]} */
    #errors = [];
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
        do {
            let {value, done} = (await this.#generator.next());
            this.#finishedSubtaskCount += upcomingSubtasks;
            if (value?.error !== undefined) {
                this.#errors.push({
                    error: value.error,
                    errorKnown: value.errorKnown,
                    addressed: false
                });
            }
            if (done || this.#done) {
                break;
            }

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
     * @param {number} errorIndex
     */
    addressErrorIndex(errorIndex) {
        const error = this.#errors[errorIndex];
        if (error === undefined) {
            console.log(`Error index ${errorIndex} on job ${this.#jobID} was not found`);
            return;
        }
        error.addressed = true;
    }

    unaddressedErrors() {
        return this.#errors.filter(error => !error.addressed);
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
            errors: this.#errors,
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
        if (job.isDone() && job.unaddressedErrors().length === 0) {
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
     * @param {number} errorIndex
     */
    addressErrorOnRunner(runner, jobID, errorIndex) {
        const runnerJobs = this.#runnersJobs.get(runner);
        if (runnerJobs === undefined) {
            return;
        }

        const job = runnerJobs.get(jobID);
        job.addressErrorIndex(errorIndex);
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