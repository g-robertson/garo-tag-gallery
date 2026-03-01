import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';

import { Page} from "../pages.js";
import { PersistentState, State, ConstState } from '../../js/state.js';
import { executeFunctions } from '../../js/client-util.js';
import { FetchCache } from '../../js/fetch-cache.js';
import AdjustableWidgets from '../../components/adjustable-widgets.jsx';
import OptionedLazyThumbnailGallery from '../../components/optioned-lazy-thumbnail-gallery.jsx';

/** 
 * @param {{
 *  page: Page
 * }}
*/
const FileSearchPageElement = ({page}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];


    /** @type {State<number[]>} */
    const clientSearchQueryState = new State(null, {name: "FileSearchPage.clientSearchQueryState"});
    const localTagServiceIDsState = new State([], {name: "FileSearchPage.localTagServiceIDsState"});
    const searchTaggablesResultState = FetchCache.Global().searchTaggablesConstState(
        clientSearchQueryState,
        ConstState.instance("Taggable"),
        ConstState.instance("Taggable_ID"),
        localTagServiceIDsState,
        addToCleanup
    );
    const [taggableCursorConstState, taggableIDsConstState] = searchTaggablesResultState.asAtomicTransforms([
        taggablesResult => taggablesResult.cursor,
        taggablesResult => taggablesResult.result
    ], addToCleanup, {name: "FileSearchPage.(taggableCursorConstState|taggableIDsConstState)"});
    
    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    };

    return (
        <div style={{width: "100%", height: "100%"}} onAdd={onAdd}>
            <AdjustableWidgets
                persistentState={page.persistentState.registerState("adjustableWidgets", new PersistentState(), {addToCleanup})}
                flexDirection="row"
                widgets={[
                    {
                        element: <TagsSelector
                            taggableCursorConstState={taggableCursorConstState}
                            onSearchChanged={(clientSearchQuery, localTagServiceIDs) => {
                                clientSearchQueryState.set(clientSearchQuery);
                                localTagServiceIDsState.set(localTagServiceIDs);
                            }}
                            persistentState={page.persistentState.registerState("tagsSelector", new PersistentState(), {addToCleanup})}
                        />,
                        defaultFlex: 1,
                        minFlex: 0.3
                    },
                    {
                        element: <OptionedLazyThumbnailGallery
                            taggableCursorConstState={taggableCursorConstState}
                            taggableIDsConstState={taggableIDsConstState}
                        />,
                        defaultFlex: 3,
                        minFlex: 1
                    }
                ]}
            />
        </div>
    );
};

export default FileSearchPageElement;
export const FILE_SEARCH_PAGE_NAME = "file-search-page";
export const FILE_SEARCH_PAGE_DEFAULT_DISPLAY_NAME = "New file search page";