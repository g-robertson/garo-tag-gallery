import '../../global.css';
import { User } from '../js/user.js';
import TagsSelector from '../../components/tags-selector.jsx';
import { useRef } from 'react';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  fetchCache: FetchCache
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
export const TagSelectorModal = ({user, fetchCache, modalOptions, pushModal, popModal}) => {
    /** @type {{current: ClientSearchQuery | null}} */
    const searchObjectsRef = useRef(null);
    modalOptions.extraProperties.initialSelectedTags ??= [];
    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            {modalOptions.extraProperties.titleText}
            <div style={{width: "100%", height: "100%"}}>
                <TagsSelector
                    fetchCache={fetchCache}
                    user={user}
                    pushModal={pushModal}
                    searchType={modalOptions.extraProperties.searchType}
                    initialSelectedTags={modalOptions.extraProperties.initialSelectedTags}
                    onSearchChanged={(clientSearchQuery) => {
                        searchObjectsRef.current = clientSearchQuery;
                    }}
                />
            </div>
            <input style={{margin: 8}} type="button" value={modalOptions.extraProperties.selectionButtonText} onClick={() => {
                modalOptions.resolve(searchObjectsRef.current);
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
export const TAG_SELECTOR_MODAL_PROPERTIES = MODAL_PROPERTIES;