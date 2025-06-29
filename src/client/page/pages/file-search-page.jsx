import { useEffect, useState } from 'react';
import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import { fjsonParse } from '../../js/client-util.js';
import { User } from '../js/user.js';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import { GALLERY_MODAL_PROPERTIES } from '../../modal/modals/gallery.jsx';

/** @import {SearchObject} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  existingState: any
 *  updateExistingStateProp: (key: string, value: any) => void
 * }}
*/
const FileSearchPage = ({user, pushModal, existingState, updateExistingStateProp}) => {
    existingState ??= {};
    updateExistingStateProp ??= () => {};

    const [taggableIDs, setTaggableIDs] = useState(existingState?.taggableIDs ?? []);
    existingState.tagsSelector ??= {};

    return (
        <div style={{width: "100%", height: "100%"}}>
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector
                    user={user}
                    pushModal={pushModal}
                    onSearchChanged={async (clientSearchQuery) => {
                        const response = await fetch("/api/post/search-taggables", {
                            body: JSON.stringify({
                                searchQuery: clientSearchQuery
                            }),
                            headers: {
                              "Content-Type": "application/json",
                            },
                            method: "POST"
                        });

                        setTaggableIDs(await fjsonParse(response));
                    }}

                    existingState={existingState.tagsSelector}
                    updateExistingStateProp={(key, value) => {
                        existingState.tagsSelector[key] = value;
                        updateExistingStateProp("tagsSelector", existingState.tagsSelector);
                    }}
                />
            </div>
            <div style={{width: "auto", flex: 3, height: "100%"}}>
                <LazyThumbnailGallery 
                    taggableIDs={taggableIDs}
                    realizeSelectedValues={false}
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
    );
};

export default FileSearchPage;

export const PAGE_NAME = "file-search-page";
export const PAGE_DEFAULT_DISPLAY_NAME = "New file search page";