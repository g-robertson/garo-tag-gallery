import '../global.css';
import { Pages } from './pages.js';
import DuplicatesProcessingPage, { DUPLICATES_PROCESSING_PAGE_NAME } from './pages/duplicates-page.jsx';

import FileSearchPage, { FILE_SEARCH_PAGE_NAME } from './pages/file-search-page.jsx';
import { ReferenceableReact } from '../js/client-util.js';
import { useEffect } from 'react';

/**
 * @typedef {Object} PageType
 * @property {string} pageName
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} existingState
 * @property {Record<string, any>} extraProperties
*/

const PageElement = () => {
    const PageContents = ReferenceableReact();

    useEffect(() => {
        const onCurrentPageChanged = () => {
            const page = Pages.Global().currentPage;
            if (page === undefined) {
                PageContents.dom.textContent = "";
                return;
            }
            
            PageContents.dom.replaceChildren(...(<dom>
                <div className="page-topbar">
                    <div className="page-topbar-right">
                        <div className="page-title">{page.pageDisplayName}</div>
                        <div className="page-cancel">X</div>
                    </div>
                </div>
                <div className="page-contents">
                    {(() => {
                        if (page.pageType === FILE_SEARCH_PAGE_NAME) {
                            return <FileSearchPage page={page} />
                        } else if (page.pageType === DUPLICATES_PROCESSING_PAGE_NAME) {
                            return <DuplicatesProcessingPage existingState={page.existingState} />
                        }
                    })()}
                </div>
            </dom>));
        }
        onCurrentPageChanged();

        let cleanup = () => {};
        cleanup = Pages.Global().addOnCurrentPageChangedCallback(onCurrentPageChanged, cleanup);
        return cleanup;
    }, []);


    return PageContents.react(<div className="page" style={{marginLeft: 8, marginRight: 8, width: "calc(100% - 16px)" }}></div>);
};

export default PageElement;