import '../global.css';
import { Pages } from './pages.js';
import DuplicatesProcessingPage, { DUPLICATES_PROCESSING_PAGE_NAME } from './pages/duplicates-page.jsx';

import FileSearchPage, { FILE_SEARCH_PAGE_NAME } from './pages/file-search-page.jsx';
import { executeFunctions, ReferenceableReact } from '../js/client-util.js';

/**
 * @typedef {Object} PageType
 * @property {string} pageName
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} persistentState
*/

const PageElement = () => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const FullPage = ReferenceableReact();
    const PageTitle = ReferenceableReact();
    const PageContents = ReferenceableReact();

    const onAdd = () => {
        const onCurrentPageChanged = () => {
            const page = Pages.Global().currentPage;
            if (page === undefined) {
                // Removes all children
                PageContents.dom.replaceChildren();
                FullPage.dom.style.display = "none";
                return;
            }

            FullPage.dom.style.display = "flex";
            PageTitle.dom.textContent = page.pageDisplayName;

            PageContents.dom.replaceChildren(...page.dom);
        }
        onCurrentPageChanged();

        Pages.Global().addOnCurrentPageChangedCallback(onCurrentPageChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };


    return FullPage.react(
        <div onAdd={onAdd} className="page" style={{marginLeft: 8, marginRight: 8, width: "calc(100% - 16px)" }}>
            <div className="page-topbar">
                <div className="page-topbar-right">
                    {PageTitle.react(<div className="page-title"></div>)}
                    <div className="page-cancel" onClick={() => {
                        Pages.Global().removePage(Pages.Global().currentPage)
                    }}>X</div>
                </div>
            </div>
            {PageContents.react(<div className="page-contents"></div>)}
        </div>
    );
};

export default PageElement;