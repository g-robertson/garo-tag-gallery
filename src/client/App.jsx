import { useEffect, useState } from 'react';
import './global.css';
import Navbar from './navbar.jsx';
import Modal from './modal/modal.jsx';
import getMe from '../api/client-get/me.js';
import { User } from './js/user.js';
import Page from './page/page.jsx';
import PageNavbar from './page-navbar.jsx';
import setUserPages from '../api/client-get/set-user-pages.js';
import { FetchCache } from './js/client-util.js';
import getActiveJobs from '../api/client-get/active-jobs.js';
import cancelJob from '../api/client-get/cancel-job.js';

/** @import {PageType} from "./page/page.jsx" */
/** @import {ModalOptions} from "./modal/modal.jsx" */
/** @import {ClientJob} from "../db/job-manager.js" */

/**
 * @typedef {Object} Setters
 * @property {(activeModals: ModalOptions[]) => void} setActiveModals
 * @property {(pages: PageType[]) => void} setPages
 * @property {(activePageIndex: number | null) => void} setActivePageIndex
 * @property {(user: User) => void} setUser
 * @property {(activeJobs: ClientJob[]) => void} setActiveJobs
 * @property {(modalName: string, extraProperties: any) => Promise<any>} pushModal
 * @property {() => void} popModal
 * 
 * @typedef {Object} States
 * @property {FetchCache} fetchCache
 * @property {User} user
 * @property {ModalOptions[]} activeModals
 * @property {number} activePageIndex
 * @property {PageType[]} pages
 * @property {ClientJob[]} activeJobs
 */

const App = () => {
    /** @type {[ModalOptions[], (activeModals: ModalOptions[]) => void]} */
    const [activeModals, setActiveModals] = useState([]);
    /** @type {[PageType[], (pages: PageType[]) => void]} */
    const [pages, setPages] = useState([]);
    /** @type {[number, (activePageIndex: number) => void]} */
    const [activePageIndex, setActivePageIndex] = useState(-1);
    /** @type {[ClientJob[], (activeJobs: ClientJob[]) => void]} */
    const [activeJobs, setActiveJobs] = useState([]);
    /** @type {[Set<string>, (minimizedJobs: Set<string>) => void]} */
    const [minimizedJobs, setMinimizedJobs] = useState(new Set());
    const [user, setUser] = useState(User.EMPTY_USER);
    const [fetchCache, setFetchCache] = useState(new FetchCache());
    fetchCache.rerender = () => {setFetchCache(new FetchCache(fetchCache))};
    useEffect(() => {
        (async () => {
            setUser(await getMe());
            setActiveJobs(await getActiveJobs());
        })();
    }, []);

    useEffect(() => {
        if (activeJobs.length === 0) {
            return;
        }

        const pingJobsInterval = setInterval(async () => {
            setActiveJobs(await getActiveJobs());
        }, 1000);
        return () => { clearInterval(pingJobsInterval); };
    }, [activeJobs]);

    useEffect(() => {
        setPages(user.pages());
    }, [user]);

    const pushModal = async (modalName, extraProperties) => {
        return new Promise(resolve => {
            setters.setActiveModals([...states.activeModals, {modalName, extraProperties, resolve}]);
        });
    }
    const popModal = () => {
        activeModals[activeModals.length - 1].resolve();
        setActiveModals([...activeModals.slice(0, -1)]);
    }
    
    const setters = {
        setPages: async (pages) => {
            setPages(pages);
            await setUserPages(pages);
        },
        setActivePageIndex,
        setUser,
        setActiveModals,
        pushModal,
        popModal,
        setActiveJobs,
    };
    const states = {
        fetchCache,
        user,
        pages,
        activePageIndex,
        activeModals,
        activeJobs
    };

    return (
        <div>
            <div style={{flexDirection: "column", pointerEvents: activeModals.length === 0 ? "auto" : "none"}}>
                <div>
                    <Navbar states={states} setters={setters} />
                </div>
                <div>
                    <PageNavbar states={states} setters={setters} />
                </div>
                <div>
                    <Page states={states} setters={setters} />
                </div>
            </div>
            <div>
                {activeModals.map((modalOptions, index) => (
                    <div style={{pointerEvents: activeModals.length - 1 === index ? "auto" : "none"}}>
                        <Modal states={states} setters={setters} modalOptions={modalOptions} index={index} />
                    </div>
                ))}
            </div>
            <div style={{right: 0, bottom: 0, position: "absolute", flexDirection: "column", zIndex: 9999}}>
                {activeJobs.filter(job => !minimizedJobs.has(job.jobID)).map(job => (
                    <div className="modal" style={{flexDirection: "column", width: "20vw"}}>
                        <div className="modal-topbar">
                            <div className="modal-title">{job.jobName}</div>
                            <div>
                                <div className="modal-minimize" onClick={() => {
                                    minimizedJobs.add(job.jobID);
                                    setMinimizedJobs(new Set(minimizedJobs));
                                }}>—</div>
                                <div className="modal-cancel" onClick={async () => {
                                    const confirm = window.confirm("Are you sure you wish to cancel this job? This will leave whatever the job is doing partially finished.");
                                    if (!confirm) {
                                        return;
                                    }
                                    await cancelJob(job.jobID);
                                    minimizedJobs.add(job.jobID);
                                }}>X</div>
                            </div>
                        </div>
                        <div className="modal-content" style={{flexDirection: "column"}}>
                            <div style={{margin: 4}}>Current task: {job.taskName}</div>
                            <div style={{margin: 4}}>Subtasks completed: {job.finishedSubtaskCount ?? 0}/{job.totalEstimatedSubtasks ?? "?"}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;