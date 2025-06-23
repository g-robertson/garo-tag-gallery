import '../../global.css';
import { User } from '../js/user.js';
import TagsSelector from '../../components/tags-selector.jsx';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  modalOptions: ModalOptions<{
 *      titleText: string
 *      selectionButtonText: string
 *      searchType: "intersect" | "union"
 *      initialSelectedTags?: ClientSearchQuery[]
 *  }>
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * }}
*/
export const TagSelectorModal = ({user, modalOptions, pushModal, popModal}) => {
    /** @type {{out: Map<string, ClientSearchQuery> | null}} */
    const searchObjectsOut = {out: null}
    modalOptions.extraProperties.initialSelectedTags ??= [];
    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            {modalOptions.extraProperties.titleText}
            <div style={{width: "100%", height: "100%"}}>
                <TagsSelector
                    user={user}
                    pushModal={pushModal}
                    searchType={modalOptions.extraProperties.searchType}
                    initialSelectedTags={modalOptions.extraProperties.initialSelectedTags}
                    searchObjectsOut={searchObjectsOut} />
            </div>
            <input style={{margin: 8}} type="button" value={modalOptions.extraProperties.selectionButtonText} onClick={() => {
                modalOptions.resolve(searchObjectsOut.out);
                popModal();
            }} />
        </div>
    );
};

export default TagSelectorModal;

export const MODAL_PROPERTIES = {
    modalName: "tag-selector-modal",
    displayName: "Tag Selector"
};