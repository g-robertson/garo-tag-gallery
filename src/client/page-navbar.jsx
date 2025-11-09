import './global.css';

/** @import {Setters, States} from "./App.jsx" */

/**
 * 
 * @param {{
 *     states: States,
 *     setters: Setters,
 * }} param0 
 * @returns 
 */
const PageNavbar = ({states, setters}) => {
    return (
        <div className="page-navbar-scroller">
            <nav className="page-navbar">
                {states.pages.map((page, index) => (<div className={`page-navbar-topbar-dropdown${states.activePageIndex === index ? " selected" : ""}`}>
                    <div className="page-navbar-topbar-dropdown-title" style={{height: "100%", alignItems: "center"}} onClick={() => {
                        setters.setActivePageIndex(index);
                    }}>
                        <div style={{marginLeft: 8}}>{page.pageDisplayName}</div>
                        
                        <div style={{marginLeft: 16, fontSize: "18px"}} class="page-cancel" onClick={(e) => {
                            if (index <= states.activePageIndex) {
                                --states.activePageIndex;
                            }
                            states.pages.splice(index, 1)
                            setters.setPages([...states.pages]);
                            setters.setActivePageIndex(states.activePageIndex);
                            e.stopPropagation();
                        }}>X</div>
                    </div>
                </div>))}
            </nav>
        </div>
    );
};

export default PageNavbar;