import '../../global.css';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import { useState } from 'react';
import DialogBox from './dialog-box.jsx';
import { mapNullCoalesce, mapUnion, setIntersect } from '../../js/client-util.js';
import { updateTaggables } from '../../../api/client-get/update-taggables.js';
import { Modals } from '../modals.js';
import { ExistingState } from '../../page/pages.js';
import { User } from '../../js/user.js';

/** @import {ExistingStateConstRef, ExistingStateRef} from "../../page/pages.js" */
/** @import {ExtraProperties} from "../modals.js" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */
/** @import {ClientQueryTag} from "../../../api/client-get/tags-from-local-tag-services.js" */
const UNKNOWN_OP_TAGS = -1;
const ADD_TAGS = 0;
const REMOVE_TAGS = 1;

/** 
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      taggableCursorConstRef: ExistingStateConstRef<string>
 *      taggableIDsConstRef: ExistingStateConstRef<number[]>
 *  }>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function ModifyTaggablesModal({ extraProperties, modalResolve }) {
    const localTagServicesConstRef = User.Global().localTagServicesRef();
    /** @type {ExistingStateRef<Set<number>>} */
    const selectedLocalTagServiceIDsRef = ExistingState.stateRef(new Set(localTagServicesConstRef.get().map(localTagService => localTagService.Local_Tag_Service_ID)));
    const taggableIDsConstRef = extraProperties.taggableIDsConstRef;
    /** @type {ExistingStateRef<Map<number, Set<string>>>} */
    const tagsToRemoveRef = ExistingState.stateRef(new Map());
    /** @type {ExistingState<Map<number, Map<string, ClientQueryTag>>>} */
    const tagsToAddRef = ExistingState.stateRef(new Map());

    return {
        component: (
            <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
                <div style={{width: "100%", height: "100%"}}>
                    <div style={{flex: 1}}></div>
                    <div style={{flex: 1}}>
                        <LocalTagsSelector
                            localTagServicesConstRef={localTagServicesConstRef}
                            selectedLocalTagServiceIDsRef={selectedLocalTagServiceIDsRef}
                            taggableCursorConstRef={extraProperties.taggableCursorConstRef}
                            taggableIDsConstRef={taggableIDsConstRef}
                            tagsToRemoveConstRef={tagsToRemoveRef}
                            tagsToAddConstRef={tagsToAddRef}
                            excludeable={false}
                            tagSelectionTitle="Add/remove tags"
                            onTagsSelected={async (tags, isExcludeOn) => {
                                let definitelyAdd = true;
                                let definitelyRemove = true;
                                for (const tag of tags) {
                                    if (tag.tagCount !== Infinity) {
                                        definitelyAdd = false;
                                    }
                                    if (tag.tagCount !== taggableIDsConstRef.get().length && !isExcludeOn) {
                                        definitelyRemove = false;
                                    }
                                }

                                let operationToPerform = UNKNOWN_OP_TAGS;
                                if (definitelyAdd) {
                                    operationToPerform = ADD_TAGS;
                                } else if (definitelyRemove) {
                                    operationToPerform = REMOVE_TAGS;
                                } else {
                                    const addOrRemove = await Modals.Global().pushModal(DialogBox, {
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

                                const tagsToRemove = tagsToRemoveRef.get();
                                const tagsToAdd = tagsToAddRef.get();
                                for (const localTagServiceID of selectedLocalTagServiceIDsRef.get()) {
                                    const setToAdd = mapNullCoalesce(tagsToAdd, localTagServiceID, new Map());
                                    const setToRemove = mapNullCoalesce(tagsToRemove, localTagServiceID, new Set());
                                    for (const tag of tags) {
                                        if (operationToPerform === ADD_TAGS) {
                                            setToAdd.set(tag.tagName, {
                                                ...tag,
                                                tagCount: taggableIDsRef.get().length
                                            });
                                            setToRemove.delete(tag.tagName);
                                        } else if (operationToPerform === REMOVE_TAGS) {
                                            setToAdd.delete(tag.tagName);
                                            setToRemove.add(tag.tagName);
                                        }
                                    }
                                }

                                console.log("force update");

                                tagsToAddRef.forceUpdate();
                                tagsToRemoveRef.forceUpdate();
                            }}
                        />
                    </div>
                </div>
                <div>
                    <input type="button" value="Save changes" onClick={async () => {
                        await updateTaggables(
                            taggableIDsConstRef.get(),
                            [...tagsToAddRef.get()].map(([localTagServiceID, tags]) => [localTagServiceID, [...tags.values()]]),
                            [...tagsToRemoveRef.get()].map(([localTagServiceID, tags]) => [localTagServiceID, [...tags]])
                        );
                        Modals.Global().popModal();
                    }}/>
                </div>
            </div>
        ),
        displayName: "Modify Taggables"
    };
};