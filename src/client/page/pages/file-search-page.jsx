import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import GalleryModal from '../../modal/modals/gallery.jsx';
import ModifyTaggablesModal from '../../modal/modals/modify-taggables.jsx';
import { trashTaggables } from '../../../api/client-get/trash-taggables.js';
import { Page} from "../pages.js";
import { PersistentState, State, ConstState } from '../../js/state.js';
import { Modals } from '../../modal/modals.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';
import { FetchCache } from '../../js/fetch-cache.js';
import AdjustableWidgets from '../../components/adjustable-widgets.jsx';

/** 
 * @param {{
 *  page: Page
 * }}
*/
const FileSearchPageElement = ({page}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const ModifySelectedTaggablesButton = ReferenceableReact();
    const TrashSelectedTaggablesButton = ReferenceableReact();

    /** @type {State<number[]>} */
    const selectedTaggableIDsState = new State([], {name: "FileSearchPage.selectedTaggableIDsState"});
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
        const onSelectedTaggables = () => {
            const selectedTaggableIDs = selectedTaggableIDsState.get();
            ModifySelectedTaggablesButton.dom.disabled = selectedTaggableIDs.length === 0;
            TrashSelectedTaggablesButton.dom.disabled = selectedTaggableIDs.length === 0;
        };
        onSelectedTaggables();

        selectedTaggableIDsState.addOnUpdateCallback(onSelectedTaggables, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };

    return (
        <div style={{width: "100%", height: "100%"}} onAdd={onAdd}>
            <AdjustableWidgets
                persistentState={page.persistentState.registerState("adjustableWidgets", new PersistentState(), {addToCleanup})}
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
                        element: <div style={{width: "100%", flexDirection: "column", height: "100%"}}>
                            <div>
                                {ModifySelectedTaggablesButton.react(<input type="button" value="Modify selected taggables" onClick={() => {
                                    Modals.Global().pushModal(ModifyTaggablesModal({
                                        taggableCursorConstState,
                                        taggableIDsConstState: selectedTaggableIDsState.asConst(),
                                    }));
                                }} />)}
                                {TrashSelectedTaggablesButton.react(<input type="button" value="Trash selected taggables" onClick={() => {
                                    const confirm = window.confirm("Are you sure you want to trash these taggables, they will be sent to trash can where they can either be restored or deleted permanently.");
                                    if (!confirm) {
                                        return;
                                    }
                                
                                    trashTaggables(selectedTaggableIDsState.get());
                                }} />)}
                            </div>
                            <div style={{flex: 1}}>
                                <LazyThumbnailGallery
                                    taggableIDsConstState={taggableIDsConstState}
                                    onValuesSelected={(_, indices) => {
                                        selectedTaggableIDsState.set(indices.map(index => taggableIDsConstState.get()[index]));
                                    }}
                                    onValuesDoubleClicked={(_, indices, indexClicked) => {
                                        const taggableIDs = taggableIDsConstState.get();
                                        if (indices.length > 1) {
                                            const indicesSet = new Set(indices);
                                            const taggableIDsToShow = taggableIDs.filter((_, index) => indicesSet.has(index));
                                            const initialTaggableIndex = taggableIDsToShow.findIndex(taggable => taggable === taggableIDs[indexClicked]);
                                        
                                            Modals.Global().pushModal(GalleryModal({
                                                taggableIDs: taggableIDsToShow,
                                                initialTaggableIndex
                                            }));
                                        } else if (indices.length === 1) {
                                            Modals.Global().pushModal(GalleryModal({
                                                taggableIDs: taggableIDs,
                                                initialTaggableIndex: indexClicked
                                            }));
                                        }
                                    }}
                                />
                            </div>
                        </div>,
                        defaultFlex: 3,
                        minFlex: 1
                    }
                ]}
                flexDirection="row"
            />
        </div>
    );
};

export default FileSearchPageElement;
export const FILE_SEARCH_PAGE_NAME = "file-search-page";
export const FILE_SEARCH_PAGE_DEFAULT_DISPLAY_NAME = "New file search page";