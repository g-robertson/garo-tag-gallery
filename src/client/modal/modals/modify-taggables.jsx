import '../../global.css';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import DialogBox from './dialog-box.jsx';
import { executeFunctions, mapNullCoalesce } from '../../js/client-util.js';
import { updateTaggables } from '../../../api/client-get/update-taggables.js';
import { Modals } from '../modals.js';
import { State } from '../../page/pages.js';
import { User } from '../../js/user.js';

/** @import {ConstState, State} from "../../page/pages.js" */
/** @import {ExtraProperties} from "../modals.js" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */
/** @import {ClientQueryTag} from "../../../api/client-get/tags-from-local-tag-services.js" */
const UNKNOWN_OP_TAGS = -1;
const ADD_TAGS = 0;
const REMOVE_TAGS = 1;

/** 
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      taggableCursorConstState: ConstState<string>
 *      taggableIDsConstState: ConstState<number[]>
 *  }>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function ModifyTaggablesModal({ extraProperties, modalResolve }) {
    const localTagServicesConstState = User.Global().localTagServicesRef();
    /** @type {State<Set<number>>} */
    const selectedLocalTagServiceIDsState = new State(new Set(localTagServicesConstState.get().map(localTagService => localTagService.Local_Tag_Service_ID)));
    const taggableIDsConstState = extraProperties.taggableIDsConstState;
    /** @type {State<Map<number, Set<string>>>} */
    const tagsToRemoveRef = new State(new Map());
    /** @type {State<Map<number, Map<string, ClientQueryTag>>>} */
    const tagsToAddRef = new State(new Map());

    return {
        component: (
            <div className="modify-taggables-modal" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                <div style={{width: "100%", height: "100%"}}>
                    <div style={{flex: 1}}></div>
                    <div style={{flex: 1}}>
                        <LocalTagsSelector
                            localTagServicesConstState={localTagServicesConstState}
                            selectedLocalTagServiceIDsState={selectedLocalTagServiceIDsState}
                            taggableCursorConstState={extraProperties.taggableCursorConstState}
                            taggableIDsConstState={taggableIDsConstState}
                            tagsToRemoveConstState={tagsToRemoveRef}
                            tagsToAddConstState={tagsToAddRef}
                            excludeable={false}
                            tagSelectionTitle="Add/remove tags"
                            onTagsSelected={async (tags, isExcludeOn) => {
                                let definitelyAdd = true;
                                let definitelyRemove = true;
                                for (const tag of tags) {
                                    if (tag.tagCount !== Infinity) {
                                        definitelyAdd = false;
                                    }
                                    if (tag.tagCount !== taggableIDsConstState.get().length && !isExcludeOn) {
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
                                for (const localTagServiceID of selectedLocalTagServiceIDsState.get()) {
                                    const setToAdd = mapNullCoalesce(tagsToAdd, localTagServiceID, new Map());
                                    const setToRemove = mapNullCoalesce(tagsToRemove, localTagServiceID, new Set());
                                    for (const tag of tags) {
                                        if (operationToPerform === ADD_TAGS) {
                                            setToAdd.set(tag.tagName, {
                                                ...tag,
                                                tagCount: taggableIDsConstState.get().length
                                            });
                                            setToRemove.delete(tag.tagName);
                                        } else if (operationToPerform === REMOVE_TAGS) {
                                            setToAdd.delete(tag.tagName);
                                            setToRemove.add(tag.tagName);
                                        }
                                    }
                                }

                                tagsToAddRef.forceUpdate();
                                tagsToRemoveRef.forceUpdate();
                            }}
                        />
                    </div>
                </div>
                <div>
                    <input type="button" value="Save changes" onClick={async () => {
                        await updateTaggables(
                            taggableIDsConstState.get(),
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