import { useState } from 'react';
import './global.css';
import { IMPORT_FILES_FROM_HYDRUS_MODAL_PROPERTIES } from './modal/modals/import-files-from-hydrus.jsx';
import { CREATE_METRIC_MODAL_PROPERTIES } from './modal/modals/create-metric.jsx';
import { CREATE_METRIC_SERVICE_MODAL_PROPERTIES } from './modal/modals/create-metric-service.jsx';
import { CHANGE_TAG_TO_METRIC_MODAL_PROPERTIES } from './modal/modals/change-tag-to-metric.jsx';
import { PAGE_NAME as FILE_SEARCH_PAGE_NAME, PAGE_DEFAULT_DISPLAY_NAME as FILE_SEARCH_DEFAULT_DISPLAY_NAME } from './page/pages/file-search-page.jsx';
import { randomID } from './js/client-util.js';
import { CREATE_URL_GENERATOR_SERVICE_MODAL_PROPERTIES } from './modal/modals/create-url-generator-service.jsx';

const FILE_MENU = "file";
const PAGES_MENU = "pages";
const METRICS_MENU = "metrics";
const PARSERS_MENU = "parsers";

/** @import {Setters, States} from "./App.jsx" */

/**
 * 
 * @param {{
 *     setters: Setters,
 *     states: States,
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 * }} param0 
 * @returns 
 */
const Navbar = ({setters, states, pushModal}) => {
    /** @type [string | null, (menuOpened: string | null) => void] */
    const [menuOpened, setMenuOpened] = useState(null);

    const toggleMenuOpened = (menu) => {
        setMenuOpened(menuOpened === menu ? null : menu);
    };

    return (
        <nav className="navbar">
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(FILE_MENU)}>File</div>
                <div className="topbar-dropdown-options" style={{display: menuOpened === FILE_MENU ? "block" : "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        pushModal(IMPORT_FILES_FROM_HYDRUS_MODAL_PROPERTIES.modalName);
                    }}>Import files from Hydrus</div>
                </div>
            </div>
            
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(PAGES_MENU)}>Pages</div>
                <div className="topbar-dropdown-options" style={{display: menuOpened === PAGES_MENU ? "block" : "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        const newActivePageIndex = states.pages.length;
                        setters.setPages([...states.pages, {
                            pageName: FILE_SEARCH_PAGE_NAME,
                            pageDisplayName: FILE_SEARCH_DEFAULT_DISPLAY_NAME,
                            pageID: randomID(32)
                        }]);
                        setters.setActivePageIndex(newActivePageIndex);

                        setMenuOpened(null);
                    }}>New file search page</div>
                </div>
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(METRICS_MENU)}>Metrics</div>
                <div className="topbar-dropdown-options" style={{display: menuOpened === METRICS_MENU ? "block" : "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        pushModal(CREATE_METRIC_SERVICE_MODAL_PROPERTIES.modalName);
                    }}>Create new metric service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        pushModal(CREATE_METRIC_MODAL_PROPERTIES.modalName);
                    }}>Create new metric</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        pushModal(CHANGE_TAG_TO_METRIC_MODAL_PROPERTIES.modalName);
                    }}>Change tag to metric</div>
                </div>
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(PARSERS_MENU)}>Parsers</div>
                <div className="topbar-dropdown-options" style={{display: menuOpened === PARSERS_MENU ? "block" : "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        pushModal(CREATE_URL_GENERATOR_SERVICE_MODAL_PROPERTIES.modalName);
                    }}>Create new URL generator service</div>
                    
                </div>
            </div>
        </nav>
    );
};

export default Navbar;