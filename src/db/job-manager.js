/**
 * @typedef {Object} TaskDetails
 * @property {number=} upcomingSubtasks
 * @property {string=} upcomingTaskName
 * @property {number=} remainingSubtasks
 */

export class Job {
    #generator;
    #durationBetweenTasks;
    #totalEstimatedSubtasks;
    #finishedSubtaskCount = 0;
    #currentTaskName;
    #done = false;
    /** @type {((job: Job) => void)[]} */
    #onFinishCallbacks = [];

    /**
     * @param {{
     *     durationBetweenTasks?: number
     *     totalEstimatedSubtasks?: number
     * }} param0
     * @param {() => AsyncGenerator<TaskDetails, TaskDetails>} generator 

     */
    constructor({
        durationBetweenTasks,
        totalEstimatedSubtasks,
    }, generator) {
        durationBetweenTasks ??= 100;
        totalEstimatedSubtasks ??= Job.UNKNOWN_SUBTASK_ESTIMATE;

        this.#generator = generator();
        this.#durationBetweenTasks = durationBetweenTasks;
        this.#totalEstimatedSubtasks = totalEstimatedSubtasks;
    }

    async execute() {
        let upcomingSubtasks = 0;
        do {
            let {value, done} = (await this.#generator.next());
            this.#finishedSubtaskCount += upcomingSubtasks;
            if (done) {
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
                console.log(upcomingSubtasks, this.#finishedSubtaskCount, this.#totalEstimatedSubtasks);
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

    /**
     * @param {(job: Job) => void} onFinish 
     */
    addOnFinishCallback(onFinish) {
        this.#onFinishCallbacks.push(onFinish);
    }

    static UNKNOWN_SUBTASK_ESTIMATE = Infinity;
}

export class JobManager {
    /** @type {Map<any, Set<Job>>} */
    #runnersJobs = new Map();

    /**
     * @param {any} runner 
     * @param {Job} job 
     */
    addJobToRunner(runner, job) {
        let runnerJobs = this.#runnersJobs.get(runner);
        if (runnerJobs === undefined) {
            this.#runnersJobs.set(runner, new Set());
            runnerJobs = this.#runnersJobs.get(runner);
        }

        job.addOnFinishCallback(job => {
            runnerJobs.delete(job);
        });

        runnerJobs.add(job);
        job.execute();
    }

    /**
     * @param {any} runner 
     */
    getJobsForRunner(runner) {
        return [...this.#runnersJobs.get(runner)] ?? [];
    }
}