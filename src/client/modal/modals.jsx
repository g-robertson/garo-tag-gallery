import '../global.css';

import { Modals } from './modals.js';
import ModalElement from './modal.jsx';
import { executeFunctions, ReferenceableReact } from '../js/client-util.js';

const ModalsElement = () => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const ModalsContainer = ReferenceableReact();
    const onAdd = () => {
        Modals.Global().addOnPushCallback((modal, index) => {
            const lastChild = ModalsContainer.dom.lastChild;
            if (lastChild !== null) {
                lastChild.style.pointerEvents = "none";
            }
            ModalsContainer.dom.appendChild(<div dom style={{pointerEvents: "auto"}}>
                <ModalElement modal={modal} index={index} />
            </div>
        )}, addToCleanup);
        
        Modals.Global().addOnPopCallback(() => {
            ModalsContainer.dom.removeChild(ModalsContainer.dom.lastChild);
            const lastChild = ModalsContainer.dom.lastChild;
            if (lastChild !== null) {
                lastChild.style.pointerEvents = "auto";
            }
        }, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };

    return ModalsContainer.react(<div onAdd={onAdd}></div>);
};

export default ModalsElement;