import { useRef, useState } from 'react';
import '../../global.css';
import { User } from '../js/user.js';
import TagsSelector from '../../components/tags-selector.jsx';

/** @import {ModalProperties} from "../modal.jsx" */
/** @import {SearchObject} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  modalProperties: ModalProperties
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * }}
*/
const CreateOrSearchGroup = ({user, modalProperties, pushModal, popModal}) => {
    /** @type {{current: Map<string, SearchObject> | null}} */
    const searchObjectsRef = useRef(null);


    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            Select tags for your OR group:
            <div style={{width: "100%", height: "100%"}}>
                <TagsSelector user={user} pushModal={pushModal} initialSelectedTags={modalProperties?.extraProperties?.initialSelectedTags} searchObjectsRef={searchObjectsRef} />
            </div>
            <input style={{margin: 8}} type="button" value="Select OR group" onClick={() => {
                modalProperties.resolve([...searchObjectsRef.current.values()]);
                popModal();
            }} />
        </div>
    );
};

export default CreateOrSearchGroup;

export const MODAL_NAME = "create-or-search-group";
export const MODAL_DISPLAY_NAME = "Create OR search group";