import '../../global.css';
import TagsSelector from '../../components/tags-selector.jsx';
import { Modals } from '../../modal/modals.js';
import { State } from '../../page/pages.js';

/** @import {ClientSearchQuery} from "../../../api/post/search-taggables.js" */
/** @import {State} "../../page/pages.js" */

/** 
 * @param {{
 *  titleText: string
 *  selectionButtonText: string
 *  searchType: "intersect" | "union"
 *  initialSelectedTags?: ClientSearchQuery[]
 * }}
*/
export default function TagSelectorModal({ titleText, selectionButtonText, searchType, initialSelectedTags }) {
    /** @type {State<ClientSearchQuery | null>} */
    const searchObjectsState = new State(null);
    initialSelectedTags ??= [];

    let modalResolve;
    /** @type {Promise<ClientSearchQuery>} */
    const promiseValue = new Promise(resolve => { modalResolve = resolve; });
    
    return {
        component: (
            <div class="tag-selector-modal" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                {titleText}
                <div style={{width: "100%", height: "100%"}}>
                    <TagsSelector
                        searchType={searchType}
                        initialSelectedTags={initialSelectedTags}
                        onSearchChanged={(clientSearchQuery) => {
                            searchObjectsState.set(clientSearchQuery);
                        }}
                    />
                </div>
                <input style={{margin: 8}} type="button" value={selectionButtonText} onClick={() => {
                    modalResolve(searchObjectsState.get());
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Tag Selector",
        promiseValue
    };
};