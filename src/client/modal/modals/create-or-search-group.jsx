import '../../global.css';
import { User } from '../js/user.js';
import { TagSelectorModal } from './tag-selector-modal.jsx';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 *  modalOptions: ModalOptions
 * }}
*/
const CreateOrSearchGroup = ({states, setters, modalOptions}) => {
    return (
        <TagSelectorModal
            states={states}
            modalOptions={{
                ...modalOptions,
                extraProperties: {
                    ...modalOptions.extraProperties,
                    searchType: "union",
                    titleText: modalOptions.extraProperties.titleText ?? "Select tags for your OR group:",
                    selectionButtonText: modalOptions.extraProperties.selectionButtonText ?? "Select OR Group"
                }
            }}
            setters={setters}
        />
    );
};

export default CreateOrSearchGroup;

export const MODAL_PROPERTIES = {
    modalName: "create-or-search-group",
    displayName: "Create OR search group"
};
export const CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES = MODAL_PROPERTIES;