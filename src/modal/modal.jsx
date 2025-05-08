import { useState } from 'react';
import '../global.css';

import ImportFiles, { MODAL_NAME as IMPORT_FILES_MODAL_NAME, MODAL_DISPLAY_NAME as IMPORT_FILES_MODAL_DISPLAY_NAME } from '../import-files/import-files';
const MODALS = {
    [IMPORT_FILES_MODAL_NAME]: {
        component: ImportFiles,
        modalDisplayName: IMPORT_FILES_MODAL_DISPLAY_NAME
    }
}

const Modal = ({modalName, popModal, user}) => {
    const {component, modalDisplayName} = MODALS[modalName];

    return (<div className="modal">
        <div className="modal-topbar">
            <div className="modal-title">{modalDisplayName}</div>
            <div className="modal-cancel" onClick={popModal}>X</div>
        </div>
        <div className="modal-content">
            {component({user})}
        </div>
    </div>);
};

export default Modal;