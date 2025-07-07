import '../../global.css';
import { User } from '../js/user.js';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import { useState } from 'react';
import { DIALOG_BOX_MODAL_PROPERTIES } from './dialog-box.jsx';
import { FetchCache, mapNullCoalesce, mapUnion, setIntersect } from '../../js/client-util.js';
import { updateTaggables } from '../../../api/client-get/update-taggables.js';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */
/** @import {ClientQueryTag} from "../../../api/client-get/tags-from-local-tag-services.js" */
const UNKNOWN_OP_TAGS = -1;
const ADD_TAGS = 0;
const REMOVE_TAGS = 1;

/** 
 * @param {{
 *  fetchCache: FetchCache
 *  user: User
 *  modalOptions: ModalOptions<{
 *      taggableIDs: number[]
 *  }>
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * }}
*/
export const ModifyTaggablesModal = ({fetchCache, user, modalOptions, pushModal, popModal}) => {
    const taggableIDs = modalOptions.extraProperties.taggableIDs;
    /** @type {[Map<number, Set<string>>, (tagsToRemove: Map<number, Set<string>>) => void]} */
    const [tagsToRemove, setTagsToRemove] = useState(new Map());
    /** @type {[Map<number, Map<string, ClientQueryTag>>, (tagsToAdd: Map<number, Map<string, ClientQueryTag>>) => void]} */
    const [tagsToAdd, setTagsToAdd] = useState(new Map());
    /** @type {[number[], (localTagServiceIDs: number[]) => void]} */
    const [localTagServiceIDs, setLocalTagServiceIDs] = useState([]);

    const tagsToRemoveForLocalTagServiceIDs = setIntersect(localTagServiceIDs.map(localTagServiceID => tagsToRemove.get(localTagServiceID) ?? new Set()));
    const tagsToAddForLocalTagServiceIDs = mapUnion(localTagServiceIDs.map(localTagServiceID => tagsToAdd.get(localTagServiceID) ?? new Map()));

    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            <div style={{width: "100%", height: "100%"}}>
                <div style={{flex: 1}}></div>
                <div style={{flex: 1}}>
                    <LocalTagsSelector
                        fetchCache={fetchCache}
                        localTagServices={user.localTagServices()}
                        pushModal={pushModal}
                        taggableIDs={taggableIDs}
                        tagsToRemove={tagsToRemoveForLocalTagServiceIDs}
                        tagsToAdd={tagsToAddForLocalTagServiceIDs}
                        excludeable={false}
                        tagSelectionTitle="Add/remove tags"
                        onTagsSelected={async (tags, isExcludeOn) => {
                            let definitelyAdd = true;
                            let definitelyRemove = true;
                            for (const tag of tags) {
                                if (tag.tagCount !== Infinity) {
                                    definitelyAdd = false;
                                }
                                if (tag.tagCount !== taggableIDs.length && !isExcludeOn) {
                                    definitelyRemove = false;
                                }
                            }

                            let operationToPerform = UNKNOWN_OP_TAGS;
                            if (definitelyAdd) {
                                operationToPerform = ADD_TAGS;
                            } else if (definitelyRemove) {
                                operationToPerform = REMOVE_TAGS;
                            } else {
                                const addOrRemove = await pushModal(DIALOG_BOX_MODAL_PROPERTIES.modalName, {
                                    displayName: "Add or remove tags",
                                    promptText: "This set of taggables already has some of the tag(s) you selected, do you wish to add or remove these tags?",
                                    optionButtons: [{
                                        text: "Add tags",
                                        value: ADD_TAGS
                                    }, {
                                        text: "Remove tags",
                                        value: REMOVE_TAGS
                                    }]
                                });
                                if (addOrRemove === undefined) {
                                    return;
                                }

                                operationToPerform = addOrRemove;
                            }
                            
                            for (const localTagServiceID of localTagServiceIDs) {
                                const setToAdd = mapNullCoalesce(tagsToAdd, localTagServiceID, new Map());
                                const setToRemove = mapNullCoalesce(tagsToRemove, localTagServiceID, new Set());
                                for (const tag of tags) {
                                    if (operationToPerform === ADD_TAGS) {
                                        setToAdd.set(tag.tagName, {
                                            ...tag,
                                            tagCount: taggableIDs.length
                                        });
                                        setToRemove.delete(tag.tagName);
                                    } else if (operationToPerform === REMOVE_TAGS) {
                                        setToAdd.delete(tag.tagName);
                                        setToRemove.add(tag.tagName);
                                    }
                                }
                            }

                            setTagsToAdd(new Map(tagsToAdd));
                            setTagsToRemove(new Map(tagsToRemove));
                        }}
                        onLocalTagServiceIDsChanged={(localTagServiceIDs) => {
                            setLocalTagServiceIDs(localTagServiceIDs);
                        }}
                    />
                </div>
            </div>
            <div>
                <input type="button" value="Save changes" onClick={async () => {
                    await updateTaggables(
                        taggableIDs,
                        [...tagsToAdd].map(([localTagServiceID, tags]) => [localTagServiceID, [...tags.values()]]),
                        [...tagsToRemove].map(([localTagServiceID, tags]) => [localTagServiceID, [...tags]]),
                        fetchCache
                    );
                    popModal();
                }}/>
            </div>
        </div>
    );
};

export default ModifyTaggablesModal;

export const MODAL_PROPERTIES = {
    modalName: "modify-taggables-modal",
    displayName: "Modify Taggables"
};
export const MODIFY_TAGGABLES_MODAL_PROPERTIES = MODAL_PROPERTIES;