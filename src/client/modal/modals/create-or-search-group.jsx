import '../../global.css';
import { User } from '../js/user.js';
import { TagSelectorModal } from './tag-selector-modal.jsx';

/** @import {ModalOptions} from "../modal.jsx" */

/** 
 * @param {{
 *  user: User
 *  modalOptions: ModalOptions
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * }}
*/
const CreateOrSearchGroup = ({user, modalOptions, pushModal, popModal}) => {
    return (
        <TagSelectorModal
            user={user}
            modalOptions={{
                ...modalOptions,
                extraProperties: {
                    ...modalOptions.extraProperties,
                    searchType: "union",
                    titleText: "Select tags for your OR group:",
                    selectionButtonText: "Select OR Group"
                }
            }}
            pushModal={pushModal}
            popModal={popModal}
        />
    );
};

export default CreateOrSearchGroup;

export const MODAL_PROPERTIES = {
    modalName: "create-or-search-group",
    displayName: "Create OR search group"
};
export const CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES = MODAL_PROPERTIES;