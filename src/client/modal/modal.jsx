import '../global.css';
import { FetchCache } from '../js/client-util.js';

/** @import {User} from "../js/user.js" */
/** @import {JSX} from "react" */
/** 
 * @type {Record<string, {
 *     component: (param0: {
 *         modalOptions: ModalOptions,
 *         fetchCache: FetchCache
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
 *         shrinkToContent?: boolean
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
        await import('./modals/import-mappings-from-backup.jsx'),
        await import('./modals/create-local-tag-service.jsx'),
        await import('./modals/update-local-tag-service.jsx'),
        await import('./modals/update-local-taggable-service.jsx'),
        await import('./modals/create-local-metric-service.jsx'),
        await import('./modals/update-local-metric-service.jsx'),
        await import('./modals/create-local-metric.jsx'),
        await import('./modals/update-local-metric.jsx'),
        await import('./modals/change-tag-to-metric.jsx'),
        await import('./modals/create-aggregate-tag.jsx'),
        await import("./modals/tag-selector-modal.jsx"),
        await import("./modals/select-from-list-of-tags-modal.jsx"),
        await import("./modals/create-metric-tag.jsx"),
        await import("./modals/create-url-generator-service.jsx"),
        await import("./modals/modify-taggables.jsx"),
        await import("./modals/dialog-box.jsx")
    ];
    
    for (const modal of modals) {
        MODALS[modal.MODAL_PROPERTIES.modalName] = {
            component: modal.default,
            modalProperties: modal.MODAL_PROPERTIES
        };
    }
})();

/**
 * @template {any} [T=Record<string, any>]
 * @typedef {Object} ModalOptions
 * @property {string} modalName
 * @property {T & {displayName?: string}} extraProperties
 * @property {(result: any) => void} resolve
 */

/**
 * 
 * @param {{
 *     modalOptions: ModalOptions
 *     fetchCache: FetchCache
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *     popModal: () => void
 *     user: User
 *     setUser: (user: User) => void
 *     index: number
 * }} param0 
 * @returns 
 */
const Modal = ({modalOptions, fetchCache, pushModal, popModal, user, setUser, index}) => {
    const {component, modalProperties} = MODALS[modalOptions.modalName];
    modalOptions.extraProperties ??= {};
    const displayName = modalOptions.extraProperties.displayName ?? modalProperties.displayName;
    const hasTopbar = modalProperties.hasTopbar ?? true;
    const hasBorder = modalProperties.hasBorder ?? true;
    const width = modalProperties.width ?? 80;
    const height = modalProperties.height ?? 80;
    const moveWithIndex = modalProperties.moveWithIndex ?? 1;
    const left = ((100 - width) / 2);
    const top = ((100 - height) / 2) + (moveWithIndex * index)

    let modalStyle = {zIndex: 999, border: hasBorder ? "2px solid white" : "none", maxWidth: "100%"}; ;
    if (modalProperties.shrinkToContent === true) {
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
                     <div className="modal-cancel" onClick={popModal}>X</div>
                 </div>
            :    <div style={{position: "absolute", top: 0, right: 0, zIndex: 100}} className="modal-cancel" onClick={popModal}>X</div>
        }
        <div className="modal-content">
            {component({modalOptions, fetchCache, user, setUser, pushModal, popModal})}
        </div>
    </div>);
};

export default Modal;