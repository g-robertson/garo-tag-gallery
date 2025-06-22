import { useEffect, useState } from 'react';
import './global.css';
import Navbar from './navbar.jsx';
import Modal from './modal/modal.jsx';
import getMe from '../api/client-get/me.js';
import { User } from './js/user.js';
import Page from './page/page.jsx';
import PageNavbar from './page-navbar.jsx';

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
    /** @type {[number | null, (activePageIndex: number | null) => void]} */
    const [activePageIndex, setActivePageIndex] = useState(null);
    const [user, setUser] = useState(User.EMPTY_USER);

    useEffect(() => {
        (async () => {
            setUser(await getMe());
        })();
    }, []);

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
            <Modal modalOptions={modalOptions} pushModal={pushModal} popModal={popModal} user={user} setUser={setUser} index={index} />
        </div>
    ));

    return (
        <div>
            <div style={{flexDirection: "column", pointerEvents: mappedModals.length === 0 ? "auto" : "none"}}>
                <div>
                    <Navbar setters={setters} states={states} pushModal={pushModal} />
                </div>
                <div>
                    <PageNavbar pages={pages} setActivePageIndex={setActivePageIndex} activePageIndex={activePageIndex}></PageNavbar>
                </div>
                <div>
                    {
                        (activePageIndex !== null)
                        ? (<Page page={pages[activePageIndex]} user={user} pushModal={pushModal} />)
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