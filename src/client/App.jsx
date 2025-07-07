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

/** @import {PageType} from "./page/page.jsx" */
/** @import {ModalOptions} from "./modal/modal.jsx" */

/**
 * @typedef {Object} Setters
 * @property {(activeModals: ModalOptions[]) => void} setActiveModals
 * @property {(pages: PageType[]) => void} setPages
 * @property {(activePageIndex: number | null) => void} setActivePageIndex
 * @property {(user: User) => void} setUser
 * 
 * @typedef {Object} States
 * @property {ModalOptions[]} activeModals
 * @property {PageType[]} pages
 */

const App = () => {
    /** @type {[ModalOptions[], (activeModals: ModalOptions[]) => void]} */
    const [activeModals, setActiveModals] = useState([]);
    /** @type {[PageType[], (pages: PageType[]) => void]} */
    const [pages, setPages] = useState([]);
    /** @type {[number, (activePageIndex: number) => void]} */
    const [activePageIndex, setActivePageIndex] = useState(-1);
    const [user, setUser] = useState(User.EMPTY_USER);
    const [fetchCache, setFetchCache] = useState(new FetchCache());
    fetchCache.rerender = () => {setFetchCache(new FetchCache(fetchCache))};
    useEffect(() => {
        (async () => {
            setUser(await getMe());
        })();
    }, []);

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
        setPages,
        setActivePageIndex,
        setUser,
        setActiveModals
    };
    const states = {
        pages,
        activeModals
    };

    const mappedModals = activeModals.map((modalOptions, index) => (
        <div style={{pointerEvents: activeModals.length - 1 === index ? "auto" : "none"}}>
            <Modal fetchCache={fetchCache} modalOptions={modalOptions} pushModal={pushModal} popModal={popModal} user={user} setUser={setUser} index={index} />
        </div>
    ));

    return (
        <div>
            <div style={{flexDirection: "column", pointerEvents: mappedModals.length === 0 ? "auto" : "none"}}>
                <div>
                    <Navbar setters={setters} states={states} pushModal={pushModal} />
                </div>
                <div>
                    <PageNavbar pages={pages} setPages={async (pages) => {
                        setPages(pages);
                        await setUserPages(pages);
                    }} setActivePageIndex={setActivePageIndex} activePageIndex={activePageIndex}></PageNavbar>
                </div>
                <div>
                    {
                        (pages[activePageIndex] !== undefined)
                        ? (<Page fetchCache={fetchCache} page={pages[activePageIndex]} user={user} pushModal={pushModal} updatePage={async (page) => {
                            // no rerender necessary here, just need to push to index to update db
                            pages[activePageIndex] = page;
                            await setUserPages(pages);
                        }} />)
                        : (<></>)
                    }
                </div>
            </div>
            <div>
                {mappedModals}
            </div>
        </div>
    );
};

export default App;