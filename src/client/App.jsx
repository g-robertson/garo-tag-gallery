import { useEffect, useState } from 'react';
import './global.css';
import Navbar from './navbar';
import Modal from './modal/modal.jsx';
import getMe from '../api/client-get/me.js';
import { User } from './js/user.js';

const App = () => {
    /** @type [string[], (activeModals: string[])=>void] */
    const [activeModals, setActiveModals] = useState([]);
    const [user, setUser] = useState(User.EMPTY_USER);
    useEffect(() => {
        (async () => {
            setUser(new User(await getMe()));
        })();
    }, []);

    const pushModal = (modalName) => {
        setActiveModals([...activeModals, modalName]);
    }
    const popModal = () => {
        setActiveModals([...activeModals.slice(0, -1)]);
    }
    const pushAction = (actionName) => {

    }
    const mappedModals = activeModals.map((modalName, index) => (
        <div style={{pointerEvents: activeModals.length - 1 === index ? "auto" : "none"}}>
            <Modal modalName={modalName} popModal={popModal} user={user} />
        </div>
    ));

    return (
        <div>
            <div style={{pointerEvents: mappedModals.length === 0 ? "auto" : "none"}}>
                <Navbar pushModal={pushModal} pushAction={pushAction} />
            </div>
            <div>
                {mappedModals}
            </div>
        </div>
    );
};

export default App;