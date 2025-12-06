import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import GalleryModal from '../../modal/modals/gallery.jsx';
import ModifyTaggablesModal from '../../modal/modals/modify-taggables.jsx';
import { trashTaggables } from '../../../api/client-get/trash-taggables.js';
import { ExistingState, Page } from '../../page/pages.js';
import { Modals } from '../../modal/modals.js';
import { ReferenceableReact } from '../../js/client-util.js';
import { FetchCache } from '../../js/fetch-cache.js';

/** @import {ExistingStateRef, ExistingStateAsyncConstRef} from "../../page/pages.js" */

/** 
 * @param {{
 *  page: Page
 * }}
*/
const FileSearchPageElement = ({page}) => {
    /**
     * @type {ExistingState<{
     *   taggableCursor: string | undefined,
     *   taggableIDs: number[],
     * }}
     */
    const existingState = page.existingState;
    const ModifySelectedTaggablesButton = ReferenceableReact();
    const TrashSelectedTaggablesButton = ReferenceableReact();
    existingState.initAssign("taggableCursor", undefined);
    existingState.initAssign("taggableIDs", []);
    /** @type {ExistingStateRef<number[]>} */
    const selectedTaggableIDsRef = ExistingState.stateRef([]);
    const clientSearchQueryRef = ExistingState.stateRef(null);
    const localTagServiceIDsRef = ExistingState.stateRef([]);
    const taggablesResultRef = FetchCache.Global().searchTaggablesAsyncConstRef(
        clientSearchQueryRef,
        ExistingState.constStateRef("Taggable"),
        ExistingState.constStateRef("Taggable_ID"),
        localTagServiceIDsRef,
        {waitForSet: true}
    );

    let cleanup = () => {};
    cleanup = taggablesResultRef.assignCleanup(cleanup);

    const onSearchChanged = () => {
        existingState.update("taggableCursor", taggablesResultRef.get().cursor);
        existingState.update("taggableIDs", taggablesResultRef.get().result);
    }
    cleanup = taggablesResultRef.addOnUpdateCallback(onSearchChanged, cleanup);

    const onAdd = () => {
        const onSelectedTaggables = () => {
            const selectedTaggableIDs = selectedTaggableIDsRef.get();
            ModifySelectedTaggablesButton.dom.disabled = selectedTaggableIDs.length === 0;
            TrashSelectedTaggablesButton.dom.disabled = selectedTaggableIDs.length === 0;
        };
        onSelectedTaggables();

        cleanup = selectedTaggableIDsRef.addOnUpdateCallback(onSelectedTaggables, cleanup);
        return cleanup;
    };

    return (
        <div style={{width: "100%", height: "100%"}} onAdd={onAdd}>
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector
                    taggableCursorConstRef={existingState.getConstRef("taggableCursor")}
                    onSearchChanged={async (clientSearchQuery, localTagServiceIDs) => {
                        clientSearchQueryRef.update(clientSearchQuery);
                        localTagServiceIDsRef.update(localTagServiceIDs);
                    }}
                    existingState={existingState.getInnerState("tagsSelector")}
                />
            </div>
            <div style={{width: "auto", flex: 3, flexDirection: "column", height: "100%"}}>
                <div>
                    {ModifySelectedTaggablesButton.react(<input type="button" value="Modify selected taggables" onClick={async () => {
                        await Modals.Global().pushModal(ModifyTaggablesModal, {
                            taggableCursorConstRef: existingState.getConstRef("taggableCursor"),
                            taggableIDsConstRef: selectedTaggableIDsRef
                        });
                    }} />)}
                    {TrashSelectedTaggablesButton.react(<input type="button" value="Trash selected taggables" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to trash these taggables, they will be sent to trash can where they can either be restored or deleted permanently.");
                        if (!confirm) {
                            return;
                        }

                        trashTaggables(selectedTaggableIDsRef.get());
                    }} />)}
                </div>
                <div style={{flex: 1}}>
                    <LazyThumbnailGallery
                        taggableIDsConstRef={existingState.getConstRef("taggableIDs")}
                        onValuesSelected={(_, indices) => {
                            const taggableIDs = existingState.get("taggableIDs");
                            selectedTaggableIDsRef.update(indices.map(index => taggableIDs[index]));
                        }}
                        onValuesDoubleClicked={(_, indices, indexClicked) => {
                            const taggableIDs = existingState.get("taggableIDs");
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