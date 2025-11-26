import { useEffect } from 'react';
import './global.css';

import { Jobs } from './jobs.js';
import { ReferenceableReact } from './js/client-util.js';

const JobsElement = () => {
    const JobsContainer = ReferenceableReact();
    useEffect(() => {
        const onJobsUpdate = () => {
            JobsContainer.dom.replaceChildren(...(Jobs.Global().nonMinimizedJobs.map(job => (
                <div dom className="job" style={{flexDirection: "column", width: "20vw"}}>
                    <div className="modal-topbar">
                        <div className="modal-title">{job.jobName}</div>
                        <div>
                            <div className="modal-minimize" onClick={() => {
                                Jobs.Global().minimizeJob(job);
                            }}>—</div>
                            <div className="modal-cancel" onClick={async () => {
                                const confirm = window.confirm("Are you sure you wish to cancel this job? This will leave whatever the job is doing partially finished.");
                                if (!confirm) {
                                    return;
                                }
                                await Jobs.Global().cancelJob(job);
                            }}>X</div>
                        </div>
                    </div>
                    <div className="modal-content" style={{flexDirection: "column"}}>
                        <div style={{margin: 4}}>Current task: {job.taskName}</div>
                        <div style={{margin: 4}}>Subtasks completed: {job.finishedSubtaskCount ?? 0}/{job.totalEstimatedSubtasks ?? "?"}</div>
                    </div>
                </div>
            ))));
        };
        Jobs.Global().addOnJobsUpdateCallback(onJobsUpdate);
        Jobs.Global().addOnJobsMinimizedUpdateCallback(onJobsUpdate);
    }, []);

    return JobsContainer.react(<div style={{right: 0, bottom: 0, position: "absolute", flexDirection: "column", zIndex: 9999}}></div>);
};

export default JobsElement;