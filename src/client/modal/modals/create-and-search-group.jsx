import '../../global.css';
import TagSelectorModal from './tag-selector-modal.jsx';

/** 
 * @param {{
 *  titleText?: string
 *  selectionButtonText?: string
 *  initialSelectedTags?: ClientSearchQuery[]
 * }}
*/
export default function CreateAndSearchGroup({ titleText, selectionButtonText, initialSelectedTags }) {
    titleText ??= "Select tags for your AND group:";
    selectionButtonText ??= "Select AND Group";

    const tagSelectorModal = TagSelectorModal({
        searchType: "intersect",
        titleText,
        selectionButtonText,
        initialSelectedTags
    });

    return {
        component: tagSelectorModal.component,
        promiseValue: tagSelectorModal.promiseValue,
        displayName: "Create AND search group",
    };
};