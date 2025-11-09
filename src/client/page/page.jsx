import setUserPages from '../../api/client-get/set-user-pages.js';
import '../global.css';
import DuplicatesProcessingPage, { DUPLICATES_PROCESSING_PAGE_NAME } from './pages/duplicates-page.jsx';

/** @import {JSX} from "react" */

import FileSearchPage, { FILE_SEARCH_PAGE_NAME } from './pages/file-search-page.jsx';

/**
 * @typedef {Object} PageType
 * @property {string} pageName
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} existingState
 * @property {Record<string, any>} extraProperties
*/

/** @import {Setters, States} from "../App.jsx" */

/**
 * @param {{
 *     states: States
 *     setters: Setters
 * }} param0 
 * @returns 
 */
const Page = ({states, setters}) => {
    const page = states.pages[states.activePageIndex];
    if (page === undefined) {
        return <></>
    }

    const updatePage = async (page) => {
        // no rerender necessary here, just need to push to index to update db
        states.pages[states.activePageIndex] = page;
        await setUserPages(states.pages);
    }
    page.existingState ??= {};
    return (<div key={page.pageID} className="page" style={{marginLeft: 8, marginRight: 8, width: "calc(100% - 16px)" }}>
        <div className="page-topbar">
            <div className="page-topbar-right">
                <div className="page-title">{page.pageDisplayName}</div>
                <div className="page-cancel">X</div>
            </div>
        </div>
        <div className="page-contents">
            {(() => {
                if (page.pageName === FILE_SEARCH_PAGE_NAME) {
                    return <FileSearchPage states={states} setters={setters} existingState={page.existingState} updateExistingStateProp={(key, value) => {
                        page.existingState[key] = value;
                        updatePage(page);
                    }} />
                } else if (page.pageName === DUPLICATES_PROCESSING_PAGE_NAME) {
                    return <DuplicatesProcessingPage states={states} setters={setters} existingState={page.existingState} updateExistingStateProp={(key, value) => {
                        page.existingState[key] = value;
                        updatePage(page);
                    }} />
                }
            })()}
        </div>
    </div>);
};

export default Page;