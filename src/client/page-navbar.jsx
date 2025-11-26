import { useEffect, useState } from 'react';
import './global.css';
import { Pages } from './page/pages.js';

const PageNavbar = () => {
    const [, rerenderStateFn] = useState({});
    const rerenderComponent = () => {rerenderStateFn({});};
    useEffect(() => {
        let cleanup = () => {};
        cleanup = Pages.Global().addOnUpdateCallback(rerenderComponent, cleanup);
        return cleanup;
    }, []);

    return (
        <div className="page-navbar-scroller">
            <nav className="page-navbar">
                {Pages.Global().pages.map((page, index) => (<div className={`page-navbar-topbar-dropdown${Pages.Global().currentPage === page  ? " selected" : ""}`}>
                    <div className="page-navbar-topbar-dropdown-title" style={{height: "100%", alignItems: "center"}} onClick={() => {
                        Pages.Global().setCurrentPage(page);
                    }}>
                        <div style={{marginLeft: 8}}>{page.pageDisplayName}</div>
                        
                        <div style={{marginLeft: 16, fontSize: "18px"}} className="page-cancel" onClick={(e) => {
                            Pages.Global().removePageAt(index);
                            e.stopPropagation();
                        }}>X</div>
                    </div>
                </div>))}
            </nav>
        </div>
    );
};

export default PageNavbar;