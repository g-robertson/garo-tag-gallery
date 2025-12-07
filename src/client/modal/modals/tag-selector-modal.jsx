import '../../global.css';
import TagsSelector from '../../components/tags-selector.jsx';
import { Modals } from '../../modal/modals.js';
import { State } from '../../page/pages.js';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */
/** @import {State} "../../page/pages.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      titleText: string
 *      selectionButtonText: string
 *      searchType: "intersect" | "union"
 *      initialSelectedTags?: ClientSearchQuery[]
 *  }>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function TagSelectorModal({ extraProperties, modalResolve }) {
    /** @type {State<ClientSearchQuery | null>} */
    const searchObjectsState = new State(null);
    extraProperties.initialSelectedTags ??= [];

    
    return {
        component: (
            <div class="tag-selector-modal" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                {extraProperties.titleText}
                <div style={{width: "100%", height: "100%"}}>
                    <TagsSelector
                        searchType={extraProperties.searchType}
                        initialSelectedTags={extraProperties.initialSelectedTags}
                        onSearchChanged={(clientSearchQuery) => {
                            searchObjectsState.set(clientSearchQuery);
                        }}
                    />
                </div>
                <input style={{margin: 8}} type="button" value={extraProperties.selectionButtonText} onClick={() => {
                    modalResolve(searchObjectsState.get());
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Tag Selector"
    };
};