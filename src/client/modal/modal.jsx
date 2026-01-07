import '../global.css';
import { Modals } from './modals.js';

/** @import {Modal} from "./modals.js" */

/**
 * @param {{
 *     modal: Modal
 *     index: number,
 * }} param0 
 * @returns 
 */
const ModalElement = ({modal, index}) => {
    const displayName = modal.displayName;
    const hasTopbar = modal.hasTopbar ?? true;
    const hasBorder = modal.hasBorder ?? true;
    const width = modal.width ?? 80;
    const height = modal.height ?? 80;
    const moveWithIndex = modal.moveWithIndex ?? 1;
    const left = ((100 - width) / 2);
    const top = ((100 - height) / 2) + (moveWithIndex * index)

    let modalStyle = {zIndex: 999, position: "absolute", border: hasBorder ? "2px solid white" : "none", maxWidth: "100%"}; ;
    if (modal.shrinkToContent === true) {
        modalStyle.top = "50%";
        modalStyle.left = "50%";
        modalStyle.transform = "translate(-50%, -50%)";
    } else {
        modalStyle.width = `${width}vw`;
        modalStyle.height = `${height}vh`;
        modalStyle.left = `${left}vw`;
        modalStyle.top = `${top}vh`
    }

    return (<div className="modal" style={modalStyle}>
        {
            hasTopbar
            ?    <div className="modal-topbar">
                     <div className="modal-title">{displayName}</div>
                     <div className="modal-cancel" onClick={() => {Modals.Global().popModal()}}>X</div>
                 </div>
            :    <div style={{position: "absolute", top: 0, right: 0, zIndex: 100}} className="modal-cancel" onClick={() => {Modals.Global().popModal()}}>X</div>
        }
        <div className="modal-content">
            {modal.component}
        </div>
    </div>);
};

export default ModalElement;