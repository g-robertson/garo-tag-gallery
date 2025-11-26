import '../../global.css';
import TagSelectorModal from './tag-selector-modal.jsx';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function CreateOrSearchGroup({ extraProperties, modalResolve }) {
    return TagSelectorModal({
        extraProperties: {
            ...extraProperties,
            searchType: "union",
            titleText: extraProperties.titleText ?? "Select tags for your OR group:",
            selectionButtonText: extraProperties.selectionButtonText ?? "Select OR Group",
            displayName: "Create OR search group"
        },
        modalResolve
    });
};