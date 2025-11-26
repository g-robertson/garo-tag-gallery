import { useEffect } from 'react';
import '../global.css';

import { Modals } from './modals.js';
import ModalElement from './modal.jsx';
import { ReferenceableReact } from '../js/client-util.js';

const ModalsElement = () => {
    const ModalsContainer = ReferenceableReact();
    useEffect(() => {
        let cleanup = () => {};
        cleanup = Modals.Global().addOnUpdateCallback(() => {
            ModalsContainer.dom.replaceChildren(...(Modals.Global().modals.map((modalInstance, index) => (
                <div dom style={{pointerEvents: modals.length - 1 === index ? "auto" : "none"}}>
                    <ModalElement modalInstance={modalInstance} index={index} />
                </div>
            ))));
        }, cleanup);
        return cleanup;
    }, []);

    const modals = Modals.Global().modals;
    return ModalsContainer.react(<div></div>);
};

export default ModalsElement;