import '../global.css';
import { randomID } from '../js/client-util.js';

/** @import {JSX} from "react" */

import FileSearchPage, { PAGE_NAME as FILE_SEARCH_PAGE_NAME } from './pages/file-search-page.jsx';
/**
 * @type {Record<string, {
 *     component: (param0: {
 *         fetchCache: FetchCache
 *         user: User
 *         pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *         existingState: any
 *         updateExistingStateProp: (key: string, value: any)
 *     }) => JSX.Element, pageDisplayName: string
 * }}
 **/
const PAGES = {
    [FILE_SEARCH_PAGE_NAME]: {
        component: FileSearchPage
    }
}

/**
 * @typedef {Object} PageType
 * @property {string} pageName
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} existingState
 * @property {Record<string, any>} extraProperties
*/

/** @import {User} from "../js/user.js" */

/**
 * @param {{
 *     page: PageType
 *     fetchCache: FetchCache
 *     user: User
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *     updatePage: (page: PageType) => Promise<void>
 * }} param0 
 * @returns 
 */
const Page = ({page, fetchCache, user, pushModal, updatePage}) => {
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
                    return <FileSearchPage user={user} fetchCache={fetchCache} pushModal={pushModal} existingState={page.existingState} updateExistingStateProp={(key, value) => {
                        page.existingState[key] = value;
                        updatePage(page);
                    }} />
                }
            })()}
        </div>
    </div>);
};

export default Page;