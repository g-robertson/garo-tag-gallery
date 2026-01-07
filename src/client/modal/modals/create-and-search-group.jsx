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
export default function CreateAndSearchGroup({ titleText, selectionButtonText, initialSelectedTags, modalResolve }) {
    titleText ??= "Select tags for your AND group:";
    selectionButtonText ??= "Select AND Group";

    return {
        component: TagSelectorModal({
            searchType: "intersect",
            titleText,
            selectionButtonText,
            initialSelectedTags,
            modalResolve
        }).component,
        displayName: "Create AND search group",
    };
};