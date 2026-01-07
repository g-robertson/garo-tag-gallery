import '../../global.css';
import TagSelectorModal from './tag-selector-modal.jsx';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  titleText?: string
 *  selectionButtonText?: string
 *  initialSelectedTags?: ClientSearchQuery[]
 *  modalResolve: (value: any) => void
 * }}
*/
export default function CreateOrSearchGroup({ titleText, selectionButtonText, initialSelectedTags, modalResolve }) {
    titleText ??= "Select tags for your OR group:";
    selectionButtonText ??= "Select OR Group";

    return {
        component: TagSelectorModal({
            searchType: "union",
            titleText,
            selectionButtonText,
            initialSelectedTags,
            modalResolve
        }).component,
        displayName: "Create OR search group"
    };
};