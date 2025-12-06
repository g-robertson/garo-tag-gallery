import './global.css';
import { Pages } from './page/pages.js';
import { ReferenceableReact } from './js/client-util.js';

const PageNavbar = () => {
    const PageNavbarContents = ReferenceableReact();

    const onAdd = () => {
        const onPageUpdate = () => {
            PageNavbarContents.dom.replaceChildren(...Pages.Global().pages.map((page, index) => (
                <div dom className={`page-navbar-topbar-dropdown${Pages.Global().currentPage === page  ? " selected" : ""}`}>
                    <div className="page-navbar-topbar-dropdown-title" style={{height: "100%", alignItems: "center"}} onClick={() => {
                        Pages.Global().setCurrentPage(page);
                    }}>
                        <div style={{marginLeft: 8}}>{page.pageDisplayName}</div>
                        
                        <div style={{marginLeft: 16, fontSize: "18px"}} className="page-cancel" onClick={(e) => {
                            Pages.Global().removePageAt(index);
                            e.stopPropagation();
                        }}>X</div>
                    </div>
                </div>
            )));
        }
        onPageUpdate();

        let cleanup = () => {};
        cleanup = Pages.Global().addOnUpdateCallback(onPageUpdate, cleanup);
        return cleanup;
    };

    return <div className="page-navbar-scroller" onAdd={onAdd}>
        {PageNavbarContents.react(<nav className="page-navbar"></nav>)}
    </div>;
};

export default PageNavbar;