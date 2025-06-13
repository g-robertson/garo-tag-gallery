import '../global.css';

/** @import {User} from "../js/user.js" */
/** @import {JSX} from "react" */
/** 
 * @type {Record<string, {
 *     component: (param0: {
 *         modalOptions: ModalOptions,
 *         pushModal: (modalName: string, extraProperties: any) => Promise<any>,
 *         popModal: () => void
 *         user: User
 *     }) => JSX.Element
 *     modalProperties: {
 *         modalName: string
 *         displayName: string
 *         width?: number
 *         height?: number
 *         hasTopbar?: boolean
 *         moveWithIndex?: number
 *     }
 * }}
 **/
const MODALS = {};

(async () => {
    const modals = [
        await import("./modals/gallery.jsx"),
        await import('./modals/create-or-search-group.jsx'),
        await import('./modals/import-files-from-hydrus.jsx'),
        await import('./modals/create-metric-service.jsx'),
        await import('./modals/create-metric.jsx'),
    ];
    
    for (const modal of modals) {
        MODALS[modal.MODAL_PROPERTIES.modalName] = {
            component: modal.default,
            modalProperties: modal.MODAL_PROPERTIES
        };
    }
})();

/**
 * @typedef {Object} ModalOptions
 * @property {string} modalName
 * @property {any} extraProperties
 * @property {(result: any) => void} resolve
 */

/**
 * 
 * @param {{
 *     modalOptions: ModalOptions
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *     popModal: () => void
 *     user: User
 *     index: number
 * }} param0 
 * @returns 
 */
const Modal = ({modalOptions, pushModal, popModal, user, index}) => {
    const {component, modalProperties} = MODALS[modalOptions.modalName];

    const hasTopbar = modalProperties.hasTopbar ?? true;
    const hasBorder = modalProperties.hasBorder ?? true;
    const width = modalProperties.width ?? 80;
    const height = modalProperties.height ?? 80;
    const moveWithIndex = modalProperties.moveWithIndex ?? 1;
    const left = ((100 - width) / 2);
    const top = ((100 - height) / 2) + (moveWithIndex * index)

    return (<div className="modal" style={{border: hasBorder ? "2px solid white" : "none", maxWidth: "100%", width: `${width}vw`, height: `${height}vh`, left: `${left}vw`, top: `${top}vh`}}>
        {
            hasTopbar
            ?    <div className="modal-topbar">
                     <div className="modal-title">{modalProperties.displayName}</div>
                     <div className="modal-cancel" onClick={popModal}>X</div>
                 </div>
            :    <div style={{position: "absolute", top: 0, right: 0, zIndex: 100}} className="modal-cancel" onClick={popModal}>X</div>
        }
        <div className="modal-content">
            {component({modalOptions, user, pushModal, popModal})}
        </div>
    </div>);
};

export default Modal;