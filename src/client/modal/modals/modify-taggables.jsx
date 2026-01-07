import '../../global.css';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import DialogBox from './dialog-box.jsx';
import { mapNullCoalesce } from '../../js/client-util.js';
import { updateTaggables } from '../../../api/client-get/update-taggables.js';
import { Modals } from '../modals.js';
import { State } from '../../page/pages.js';
import { User } from '../../js/user.js';

/** @import {ConstState, State} from "../../page/pages.js" */
/** @import {ClientSearchQuery} from "../../components/tags-selector.jsx" */
/** @import {ClientQueryTag} from "../../../api/client-get/tags-from-local-tag-services.js" */
const UNKNOWN_OP_TAGS = -1;
const ADD_TAGS = 0;
const REMOVE_TAGS = 1;

/** 
 * @param {{
 *  taggableCursorConstState: ConstState<string>
 *  taggableIDsConstState: ConstState<number[]>
 * }}
*/
export default function ModifyTaggablesModal({ taggableCursorConstState, taggableIDsConstState }) {
    const localTagServicesConstState = User.Global().localTagServicesState();
    /** @type {State<Set<number>>} */
    const selectedLocalTagServiceIDsState = new State(new Set(localTagServicesConstState.get().map(localTagService => localTagService.Local_Tag_Service_ID)));
    /** @type {State<Map<number, Set<string>>>} */
    const tagsToRemoveState = new State(new Map());
    /** @type {State<Map<number, Map<string, ClientQueryTag>>>} */
    const tagsToAddState = new State(new Map());

    return {
        component: (
            <div className="modify-taggables-modal" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                <div style={{width: "100%", height: "100%"}}>
                    <div style={{flex: 1}}></div>
                    <div style={{flex: 1}}>
                        <LocalTagsSelector
                            localTagServicesConstState={localTagServicesConstState}
                            selectedLocalTagServiceIDsState={selectedLocalTagServiceIDsState}
                            taggableCursorConstState={taggableCursorConstState}
                            taggableIDsConstState={taggableIDsConstState}
                            tagsToRemoveConstState={tagsToRemoveState}
                            tagsToAddConstState={tagsToAddState}
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
                                    const addOrRemove = await Modals.Global().pushModal(DialogBox({
                                        displayName: "Add or remove tags",
                                        promptText: "This set of taggables already has some of the tag(s) you selected, do you wish to add or remove these tags?",
                                        optionButtons: [{
                                            text: "Add tags",
                                            value: ADD_TAGS
                                        }, {
                                            text: "Remove tags",
                                            value: REMOVE_TAGS
                                        }]
                                    }));
                                    if (addOrRemove === undefined) {
                                        return;
                                    }

                                    operationToPerform = addOrRemove;
                                }

                                const tagsToRemove = tagsToRemoveState.get();
                                const tagsToAdd = tagsToAddState.get();
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

                                tagsToAddState.forceUpdate();
                                tagsToRemoveState.forceUpdate();
                            }}
                        />
                    </div>
                </div>
                <div>
                    <input type="button" value="Save changes" onClick={async () => {
                        await updateTaggables(
                            taggableIDsConstState.get(),
                            [...tagsToAddState.get()].map(([localTagServiceID, tags]) => [localTagServiceID, [...tags.values()]]),
                            [...tagsToRemoveState.get()].map(([localTagServiceID, tags]) => [localTagServiceID, [...tags]])
                        );
                        Modals.Global().popModal();
                    }}/>
                </div>
            </div>
        ),
        displayName: "Modify Taggables"
    };
};