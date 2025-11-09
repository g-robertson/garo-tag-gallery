import '../../global.css';
import { FetchCache } from '../../js/client-util.js';
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
const CreateAndSearchGroup = ({states, modalOptions, setters}) => {
    return (
        <TagSelectorModal
            states={states}
            modalOptions={{
                ...modalOptions,
                extraProperties: {
                    ...modalOptions.extraProperties,
                    searchType: "intersect",
                    titleText: modalOptions.extraProperties.titleText ?? "Select tags for your AND group:",
                    selectionButtonText: modalOptions.extraProperties.selectionButtonText ?? "Select AND Group"
                }
            }}
            setters={setters}
        />
    );
};

export default CreateAndSearchGroup;

export const MODAL_PROPERTIES = {
    modalName: "create-and-search-group",
    displayName: "Create AND search group"
};
export const CREATE_AND_SEARCH_GROUP_MODAL_PROPERTIES = MODAL_PROPERTIES;