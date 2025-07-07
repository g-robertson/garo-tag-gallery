import { useEffect, useRef, useState } from 'react';
import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import { FetchCache } from '../../js/client-util.js';
import { User } from '../js/user.js';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import { GALLERY_MODAL_PROPERTIES } from '../../modal/modals/gallery.jsx';
import { MODIFY_TAGGABLES_MODAL_PROPERTIES } from '../../modal/modals/modify-taggables.jsx';
import { searchTaggables } from '../../../api/client-get/search-taggables.js';
import { trashTaggables } from '../../../api/client-get/trash-taggables.js';

/** @import {SearchObject} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  fetchCache: FetchCache
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  existingState: any
 *  updateExistingStateProp: (key: string, value: any) => void
 * }}
*/
const FileSearchPage = ({fetchCache, user, pushModal, existingState, updateExistingStateProp}) => {
    existingState ??= {};
    existingState.tagsSelector ??= {};
    updateExistingStateProp ??= () => {};

    const [taggableIDs, setTaggableIDs] = useState(existingState?.taggableIDs);
    const [selectedTaggableIDs, setSelectedTaggableIDs] = useState([]); 

    const previousSearch = useRef(null);

    useEffect(() => {
        if (previousSearch.current !== null) {
            (async () => {
                setTaggableIDs(await searchTaggables(previousSearch.current.clientSearchQuery, previousSearch.current.localTagServiceIDs, fetchCache));
            })();
        }
    }, [fetchCache])

    return (
        <div style={{width: "100%", height: "100%"}}>
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector
                    fetchCache={fetchCache}
                    user={user}
                    taggableIDs={taggableIDs}
                    pushModal={pushModal}
                    onSearchChanged={async (clientSearchQuery, localTagServiceIDs) => {
                        previousSearch.current = {
                            clientSearchQuery,
                            localTagServiceIDs
                        };
                        setTaggableIDs(await searchTaggables(clientSearchQuery, localTagServiceIDs, fetchCache));
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
                        await pushModal(MODIFY_TAGGABLES_MODAL_PROPERTIES.modalName, {taggableIDs: selectedTaggableIDs});
                    }} />
                    <input type="button" disabled={selectedTaggableIDs.length === 0} value="Trash selected taggables" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to trash these taggables, they will be sent to trash can where they can either be restored or deleted permanently.");
                        if (!confirm) {
                            return;
                        }

                        trashTaggables(selectedTaggableIDs, fetchCache);
                    }} />
                </div>
                <div style={{flex: 1}}>
                    <LazyThumbnailGallery 
                        taggableIDs={taggableIDs ?? []}
                        realizeSelectedValues={false}
                        onValuesSelected={(_, indices) => {
                            setSelectedTaggableIDs(indices.map(index => taggableIDs[index]));
                        }}
                        onValuesDoubleClicked={(_, indices, indexClicked) => {
                            if (indices.length > 1) {
                                pushModal(GALLERY_MODAL_PROPERTIES.modalName, {
                                    taggableIDs: indices.map(index => taggableIDs[index]),
                                    initialTaggableID: Number(taggableIDs[indexClicked])
                                });
                            } else if (indices.length === 1) {
                                pushModal(GALLERY_MODAL_PROPERTIES.modalName, {
                                    taggableIDs,
                                    initialTaggableID: Number(taggableIDs[indices[0]])
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
export const PAGE_DEFAULT_DISPLAY_NAME = "New file search page";