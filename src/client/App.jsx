import './global.css';
import Navbar from './navbar.jsx';
import { User } from './js/user.js';
import PageElement from './page/page.jsx';
import PageNavbar from './page-navbar.jsx';
import { Modals } from './modal/modals.js';
import ModalsElement from './modal/modals.jsx';
import { Jobs } from './jobs.js';
import JobsElement from "./jobs.jsx";
import { Page, Pages } from './page/pages.js';
import setUserPages from '../api/client-get/set-user-pages.js';

const App = () => {
    const onAdd = () => {
        User.refreshGlobal().then(() => {
            Pages.makeGlobal(new Pages(User.Global().pages().map(Page.fromJSON)));
        });
        Jobs.refreshGlobal();

        const removePointerIfModals = () => {
            document.getElementById("non-modal-content").style.pointerEvents = Modals.Global().modals.length === 0 ? "auto" : "none";
        };

        let cleanup = () => {};
        cleanup = Modals.Global().addOnUpdateCallback(removePointerIfModals, cleanup);
        cleanup = Pages.Global().addOnUpdateCallback(() => {
            setUserPages(Pages.Global());
        }, cleanup);

        return cleanup;
    };

    return (
        <div onAdd={onAdd}>
            <div id="non-modal-content" style={{flexDirection: "column"}}>
                <div>
                    <Navbar />
                </div>
                <div>
                    <PageNavbar />
                </div>
                <div>
                    <PageElement />
                </div>
            </div>
            <div>
                <ModalsElement />
            </div>
            <div>
                <JobsElement />
            </div>
        </div>
    );
};

export default App;