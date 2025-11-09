import { useEffect, useRef, useState } from 'react';
import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import { FetchCache } from '../../js/client-util.js';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import { GALLERY_MODAL_PROPERTIES } from '../../modal/modals/gallery.jsx';
import { MODIFY_TAGGABLES_MODAL_PROPERTIES } from '../../modal/modals/modify-taggables.jsx';
import { searchTaggables } from '../../../api/client-get/search-taggables.js';
import { trashTaggables } from '../../../api/client-get/trash-taggables.js';

/** @import {SearchObject} from "../../components/tags-selector.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 *  existingState: any
 *  updateExistingStateProp: (key: string, value: any) => void
 * }}
*/
const FileSearchPage = ({states, setters, existingState, updateExistingStateProp}) => {
    existingState ??= {};
    existingState.tagsSelector ??= {};
    updateExistingStateProp ??= () => {};

    const [taggableIDs, setTaggableIDs] = useState([]);
    const [taggableCursor, setTaggableCursor] = useState();
    const [selectedTaggableIDs, setSelectedTaggableIDs] = useState([]); 

    const previousSearch = useRef(null);

    const makeSearch = async () => {
        const result = await searchTaggables(previousSearch.current.clientSearchQuery, "Taggable", "Taggable_ID", previousSearch.current.localTagServiceIDs, states.fetchCache);
        setTaggableCursor(result.cursor);
        setTaggableIDs(result.result);
    }

    useEffect(() => {
        if (previousSearch.current !== null) {
            makeSearch();
        }
    }, [states.fetchCache])

    return (
        <div style={{width: "100%", height: "100%"}}>
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector
                    states={states}
                    setters={setters}
                    taggableCursor={taggableCursor}
                    onSearchChanged={async (clientSearchQuery, localTagServiceIDs) => {
                        previousSearch.current = {
                            clientSearchQuery,
                            localTagServiceIDs
                        };
                        makeSearch();
                    }}

                    existingState={existingState.tagsSelector}
                    updateExistingStateProp={(key, value) => {
                        existingState.tagsSelector[key] = value;
                        updateExistingStateProp("tagsSelector", existingState.tagsSelector);
                    }}
                />
            </div>
            <div style={{width: "auto", flex: 3, flexDirection: "column", height: "100%"}}>
                <div>
                    <input type="button" disabled={selectedTaggableIDs.length === 0} value="Modify selected taggables" onClick={async () => {
                        await setters.pushModal(MODIFY_TAGGABLES_MODAL_PROPERTIES.modalName, {taggableIDs: selectedTaggableIDs});
                    }} />
                    <input type="button" disabled={selectedTaggableIDs.length === 0} value="Trash selected taggables" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to trash these taggables, they will be sent to trash can where they can either be restored or deleted permanently.");
                        if (!confirm) {
                            return;
                        }

                        trashTaggables(selectedTaggableIDs, states.fetchCache);
                    }} />
                </div>
                <div style={{flex: 1}}>
                    <LazyThumbnailGallery 
                        taggableIDs={taggableIDs ?? []}
                        onValuesSelected={(_, indices) => {
                            setSelectedTaggableIDs(indices.map(index => taggableIDs[index]));
                        }}
                        onValuesDoubleClicked={(_, indices, indexClicked) => {
                            if (indices.length > 1) {
                                setters.pushModal(GALLERY_MODAL_PROPERTIES.modalName, {
                                    taggableIDs: indices.map(index => taggableIDs[index]),
                                    initialTaggableIndex: 0
                                });
                            } else if (indices.length === 1) {
                                setters.pushModal(GALLERY_MODAL_PROPERTIES.modalName, {
                                    taggableIDs,
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

export default FileSearchPage;

export const PAGE_NAME = "file-search-page";
export const FILE_SEARCH_PAGE_NAME = PAGE_NAME;
export const PAGE_DEFAULT_DISPLAY_NAME = "New file search page";
export const FILE_SEARCH_PAGE_DEFAULT_DISPLAY_NAME = PAGE_DEFAULT_DISPLAY_NAME;