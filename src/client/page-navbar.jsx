import './global.css';

/** @import {PageType} from "./page/page.jsx" */

/**
 * 
 * @param {{
 *     pages: PageType[]
 *     setPages: (pages: PageType[]) => void
 *     activePageIndex: number,
 *     setActivePageIndex: (activePageIndex: number) => void
 * }} param0 
 * @returns 
 */
const PageNavbar = ({pages, setPages, activePageIndex, setActivePageIndex}) => {
    return (
        <div className="page-navbar-scroller">
            <nav className="page-navbar">
                {pages.map((page, index) => (<div className={`page-navbar-topbar-dropdown${activePageIndex === index ? " selected" : ""}`}>
                    <div className="page-navbar-topbar-dropdown-title" style={{height: "100%", alignItems: "center"}} onClick={() => {
                        setActivePageIndex(index);
                    }}>
                        <div style={{marginLeft: 8}}>{page.pageDisplayName}</div>
                        
                        <div style={{marginLeft: 16, fontSize: "18px"}} class="page-cancel" onClick={(e) => {
                            if (index <= activePageIndex) {
                                --activePageIndex;
                            }
                            pages.splice(index, 1)
                            setPages([...pages]);
                            setActivePageIndex(activePageIndex);
                            e.stopPropagation();
                        }}>X</div>
                    </div>
                </div>))}
            </nav>
        </div>
    );
};

export default PageNavbar;