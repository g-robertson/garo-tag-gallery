import '../global.css';

import { Modals } from './modals.js';
import ModalElement from './modal.jsx';
import { ReferenceableReact } from '../js/client-util.js';

const ModalsElement = () => {
    const ModalsContainer = ReferenceableReact();
    const onAdd = () => {
        let cleanup = () => {};
        cleanup = Modals.Global().addOnPushCallback((modalInstance, index) => {
            const lastChild = ModalsContainer.dom.lastChild;
            if (lastChild !== null) {
                lastChild.style.pointerEvents = "none";
            }
            ModalsContainer.dom.appendChild(<div dom style={{pointerEvents: "auto"}}>
                <ModalElement modalInstance={modalInstance} index={index} />
            </div>
        )}, cleanup);
        
        cleanup = Modals.Global().addOnPopCallback(() => {
            ModalsContainer.dom.removeChild(ModalsContainer.dom.lastChild);
            const lastChild = ModalsContainer.dom.lastChild;
            if (lastChild !== null) {
                lastChild.style.pointerEvents = "auto";
            }
        }, cleanup);
        return cleanup;
    };

    return ModalsContainer.react(<div onAdd={onAdd}></div>);
};

export default ModalsElement;