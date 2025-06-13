import { useEffect, useState } from 'react';
import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import { fjsonParse } from '../../js/client-util.js';
import { User } from '../js/user.js';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import { MODAL_PROPERTIES as GALLERY_MODAL_PROPERTIES } from '../../modal/modals/gallery.jsx';

/** @import {SearchObject} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  existingState: any
 * }}
*/
const FileSearchPage = ({user, pushModal, existingState}) => {
    const [taggableIDs, setTaggableIDs] = useState(existingState?.taggableIDs ?? []);
    existingState.tagsSelector ??= {};

    return (
        <div style={{width: "100%", height: "100%"}}>
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector
                    user={user}
                    pushModal={pushModal}
                    onSearchChanged={async (searchObjects) => {
                        const searchQuery = searchObjects.map(searchObject => searchObject.flat(Infinity).map(searchTag => ({
                            Local_Tag_ID: searchTag.localTagID,
                            exclude: searchTag.exclude
                        })));

                        const response = await fetch("/api/post/search-taggables", {
                            body: JSON.stringify({
                                searchQuery
                            }),
                            headers: {
                              "Content-Type": "application/json",
                            },
                            method: "POST"
                        });

                        setTaggableIDs(await fjsonParse(response));
                    }}

                    existingState={existingState.tagsSelector}
                />
            </div>
            <div style={{width: "auto", flex: 3, height: "100%"}}>
                <LazyThumbnailGallery 
                    taggableIDs={taggableIDs}
                    onValuesDoubleClicked={(valuesSelected) => {
                        if (valuesSelected.length > 1) {
                            pushModal(GALLERY_MODAL_PROPERTIES.modalName, {
                                taggableIDs: valuesSelected.map(value => Number(value.Taggable_ID))
                            });
                        } else if (valuesSelected.length === 1) {
                            pushModal(GALLERY_MODAL_PROPERTIES.modalName, {
                                taggableIDs,
                                initialTaggableID: Number(valuesSelected[0].Taggable_ID)
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