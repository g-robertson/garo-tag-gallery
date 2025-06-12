import './global.css';

/** @import {PageType} from "./page/page.jsx" */

/**
 * 
 * @param {{
 *     pages: PageType[]
 *     activePageIndex: number,
 *     setActivePageIndex: (activePageIndex: number) => void
 * }} param0 
 * @returns 
 */
const PageNavbar = ({pages, activePageIndex, setActivePageIndex}) => {
    return (
        <div className="page-navbar-scroller">
            <nav className="page-navbar">
                {pages.map((page, index) => (<div className={`page-navbar-topbar-dropdown${activePageIndex === index ? " selected" : ""}`}>
                    <div className="page-navbar-topbar-dropdown-title" onClick={() => {
                        setActivePageIndex(index);
                    }}>{page.pageDisplayName} [v]</div>
                </div>))}
            </nav>
        </div>
    );
};

export default PageNavbar;