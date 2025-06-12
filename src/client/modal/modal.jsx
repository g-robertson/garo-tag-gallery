import '../global.css';

/** @import {User} from "../js/user.js" */
/** @import {JSX} from "react" */

import ImportFiles, { MODAL_NAME as IMPORT_FILES_MODAL_NAME, MODAL_DISPLAY_NAME as IMPORT_FILES_MODAL_DISPLAY_NAME } from './modals/import-files-from-hydrus.jsx';
import CreateOrSearchGroup, { MODAL_NAME as CREATE_OR_SEARCH_GROUP_MODAL_NAME, MODAL_DISPLAY_NAME as CREATE_OR_SEARCH_GROUP_MODAL_DISPLAY_NAME} from './modals/create-or-search-group.jsx';
/** 
 * @type {Record<string, {
 *     component: (param0: {
 *         modalProperties: ModalProperties,
 *         pushModal: (modalName: string, extraProperties: any) => Promise<any>,
 *         popModal: () => void
 *         user: User
 *     }) => JSX.Element, modalDisplayName: string
 * }}
 **/
const MODALS = {
    [IMPORT_FILES_MODAL_NAME]: {
        component: ImportFiles,
        modalDisplayName: IMPORT_FILES_MODAL_DISPLAY_NAME
    },
    [CREATE_OR_SEARCH_GROUP_MODAL_NAME]: {
        component: CreateOrSearchGroup,
        modalDisplayName: CREATE_OR_SEARCH_GROUP_MODAL_DISPLAY_NAME
    }
}

/**
 * @typedef {Object} ModalProperties
 * @property {string} modalName
 * @property {any} extraProperties
 * @property {(result: any) => void} resolve
 */

/**
 * 
 * @param {{
 *     modalProperties: ModalProperties
 *     pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *     popModal: () => void
 *     user: User
 *     index: number
 * }} param0 
 * @returns 
 */
const Modal = ({modalProperties, pushModal, popModal, user, index}) => {
    const {component, modalDisplayName} = MODALS[modalProperties.modalName];

    return (<div className="modal" style={{top: `${10 + index}vh`}}>
        <div className="modal-topbar">
            <div className="modal-title">{modalDisplayName}</div>
            <div className="modal-cancel" onClick={popModal}>X</div>
        </div>
        <div className="modal-content">
            {component({modalProperties, user, pushModal, popModal})}
        </div>
    </div>);
};

export default Modal;