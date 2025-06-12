import '../global.css';

/** @import {JSX} from "react" */

import FileSearchPage, { PAGE_NAME as FILE_SEARCH_PAGE_NAME } from './pages/file-search-page.jsx';
/** @type {Record<string, {component: (param0: {user: User}) => JSX.Element, pageDisplayName: string}} */
const PAGES = {
    [FILE_SEARCH_PAGE_NAME]: {
        component: FileSearchPage
    }
}

/**
 * @typedef {Object} PageType
 * @property {string} pageName
 * @property {string} pageDisplayName
 * @property {Record<string, any>} extraProperties
*/

/** @import {User} from "../js/user.js" */

/**
 * @param {{
 *     page: PageType
 *     user: User
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 * }} param0 
 * @returns 
 */
const Page = ({page, user, pushModal}) => {
    const {component} = PAGES[page.pageName];
    
    return (<div className="page" style={{marginLeft: 8, marginRight: 8}}>
        <div className="page-topbar">
            <div className="page-topbar-right">
                <div className="page-title">{page.pageDisplayName}</div>
                <div className="page-cancel">X</div>
            </div>
        </div>
        <div className="page-contents">
            {component({user, pushModal})}
        </div>
    </div>);
};

export default Page;