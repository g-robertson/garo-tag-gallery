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
    const modals =  [
        await import("./modals/gallery.jsx"),
        await import('./modals/create-or-search-group.jsx'),
        await import('./modals/create-and-search-group.jsx'),
        await import('./modals/import-files-from-hydrus.jsx'),
        await import('./modals/create-metric-service.jsx'),
        await import('./modals/create-metric.jsx'),
        await import('./modals/change-tag-to-metric.jsx'),
        await import('./modals/create-aggregate-tag.jsx'),
        await import("./modals/tag-selector-modal.jsx"),
        await import("./modals/select-from-list-of-tags-modal.jsx"),
        await import("./modals/create-metric-tag.jsx"),
        await import("./modals/create-url-generator-service.jsx")
    ];
    
    for (const modal of modals) {
        MODALS[modal.MODAL_PROPERTIES.modalName] = {
            component: modal.default,
            modalProperties: modal.MODAL_PROPERTIES
        };
    }
})();

/**
 * @template {any} [T=any]
 * @typedef {Object} ModalOptions
 * @property {string} modalName
 * @property {T} extraProperties
 * @property {(result: any) => void} resolve
 */

/**
 * 
 * @param {{
 *     modalOptions: ModalOptions
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *     popModal: () => void
 *     user: User
 *     setUser: (user: User) => void
 *     index: number
 * }} param0 
 * @returns 
 */
const Modal = ({modalOptions, pushModal, popModal, user, setUser, index}) => {
    const {component, modalProperties} = MODALS[modalOptions.modalName];
    modalOptions.extraProperties ??= {};
    const hasTopbar = modalProperties.hasTopbar ?? true;
    const hasBorder = modalProperties.hasBorder ?? true;
    const width = modalProperties.width ?? 80;
    const height = modalProperties.height ?? 80;
    const moveWithIndex = modalProperties.moveWithIndex ?? 1;
    const left = ((100 - width) / 2);
    const top = ((100 - height) / 2) + (moveWithIndex * index)

    return (<div className="modal" style={{zIndex: 999, border: hasBorder ? "2px solid white" : "none", maxWidth: "100%", width: `${width}vw`, height: `${height}vh`, left: `${left}vw`, top: `${top}vh`}}>
        {
            hasTopbar
            ?    <div className="modal-topbar">
                     <div className="modal-title">{modalProperties.displayName}</div>
                     <div className="modal-cancel" onClick={popModal}>X</div>
                 </div>
            :    <div style={{position: "absolute", top: 0, right: 0, zIndex: 100}} className="modal-cancel" onClick={popModal}>X</div>
        }
        <div className="modal-content">
            {component({modalOptions, user, setUser, pushModal, popModal})}
        </div>
    </div>);
};

export default Modal;