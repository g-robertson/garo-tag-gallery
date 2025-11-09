import '../../global.css';
import TagsSelector from '../../components/tags-selector.jsx';
import { useRef } from 'react';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 *  modalOptions: ModalOptions<{
 *      titleText: string
 *      selectionButtonText: string
 *      searchType: "intersect" | "union"
 *      initialSelectedTags?: ClientSearchQuery[]
 *  }>
 * }}
*/
export const TagSelectorModal = ({states, setters, modalOptions}) => {
    /** @type {{current: ClientSearchQuery | null}} */
    const searchObjectsRef = useRef(null);
    modalOptions.extraProperties.initialSelectedTags ??= [];
    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            {modalOptions.extraProperties.titleText}
            <div style={{width: "100%", height: "100%"}}>
                <TagsSelector
                    states={states}
                    setters={setters}
                    searchType={modalOptions.extraProperties.searchType}
                    initialSelectedTags={modalOptions.extraProperties.initialSelectedTags}
                    onSearchChanged={(clientSearchQuery) => {
                        searchObjectsRef.current = clientSearchQuery;
                    }}
                />
            </div>
            <input style={{margin: 8}} type="button" value={modalOptions.extraProperties.selectionButtonText} onClick={() => {
                modalOptions.resolve(searchObjectsRef.current);
                setters.popModal();
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