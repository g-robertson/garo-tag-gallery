import '../../global.css';
import TagSelectorModal from './tag-selector-modal.jsx';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties
 *  modalResolve: (value: any) => void
 * }}
*/
export default function CreateAndSearchGroup({extraProperties, modalResolve}) {
    return TagSelectorModal({
        extraProperties: {
            ...extraProperties,
            displayName: "Create AND search group",
            searchType: "intersect",
            titleText: extraProperties.titleText ?? "Select tags for your AND group:",
            selectionButtonText: extraProperties.selectionButtonText ?? "Select AND Group"
        },
        modalResolve
    });
};