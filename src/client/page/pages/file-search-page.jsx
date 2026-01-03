import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import GalleryModal from '../../modal/modals/gallery.jsx';
import ModifyTaggablesModal from '../../modal/modals/modify-taggables.jsx';
import { trashTaggables } from '../../../api/client-get/trash-taggables.js';
import { Page, PersistentState, State, ConstState } from '../../page/pages.js';
import { Modals } from '../../modal/modals.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';
import { FetchCache } from '../../js/fetch-cache.js';

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
    const selectedTaggableIDsState = new State([]);
    const clientSearchQueryState = new State(null);
    const localTagServiceIDsState = new State([]);
    const searchTaggablesResultState = page.persistentState.registerState("searchTaggablesResult", FetchCache.Global().searchTaggablesConstState(
        clientSearchQueryState,
        ConstState.instance("Taggable"),
        ConstState.instance("Taggable_ID"),
        localTagServiceIDsState,
        addToCleanup,
        {waitForSet: true}
    ), {addToCleanup});
    const [taggableCursorConstState, taggableIDsConstState] = searchTaggablesResultState.asAtomicTransforms([
        taggablesResult => taggablesResult.cursor,
        taggablesResult => taggablesResult.result
    ], addToCleanup);

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
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector
                    taggableCursorConstState={taggableCursorConstState}
                    onSearchChanged={(clientSearchQuery, localTagServiceIDs) => {
                        clientSearchQueryState.set(clientSearchQuery);
                        localTagServiceIDsState.set(localTagServiceIDs);
                    }}
                    persistentState={page.persistentState.registerState("tagsSelector", new PersistentState())}
                />
            </div>
            <div style={{width: "auto", flex: 3, flexDirection: "column", height: "100%"}}>
                <div>
                    {ModifySelectedTaggablesButton.react(<input type="button" value="Modify selected taggables" onClick={async () => {
                        await Modals.Global().pushModal(ModifyTaggablesModal, {
                            taggableCursorConstState,
                            taggableIDsConstState: selectedTaggableIDsState.asConst()
                        });
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

                                Modals.Global().pushModal(GalleryModal, {
                                    taggableIDs: taggableIDsToShow,
                                    initialTaggableIndex
                                });
                            } else if (indices.length === 1) {
                                Modals.Global().pushModal(GalleryModal, {
                                    taggableIDs: taggableIDs,
                                    initialTaggableIndex: indexClicked
                                });
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default FileSearchPageElement;

export const PAGE_NAME = "file-search-page";
export const FILE_SEARCH_PAGE_NAME = PAGE_NAME;
export const PAGE_DEFAULT_DISPLAY_NAME = "New file search page";
export const FILE_SEARCH_PAGE_DEFAULT_DISPLAY_NAME = PAGE_DEFAULT_DISPLAY_NAME;