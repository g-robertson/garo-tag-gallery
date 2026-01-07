import '../../global.css';
import TagSelectorModal from './tag-selector-modal.jsx';

/** 
 * @param {{
 *  titleText?: string
 *  selectionButtonText?: string
 *  initialSelectedTags?: ClientSearchQuery[]
 * }}
*/
export default function CreateOrSearchGroup({ titleText, selectionButtonText, initialSelectedTags }) {
    titleText ??= "Select tags for your OR group:";
    selectionButtonText ??= "Select OR Group";

    const tagSelectorModal = TagSelectorModal({
        searchType: "union",
        titleText,
        selectionButtonText,
        initialSelectedTags,
    });

    return {
        component: tagSelectorModal.component,
        displayName: "Create OR search group",
        promiseValue: tagSelectorModal.promiseValue
    };
};