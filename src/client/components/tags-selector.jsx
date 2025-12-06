import '../global.css';
import { User } from '../js/user.js';

import CreateOrSearchGroup from '../modal/modals/create-or-search-group.jsx';
import LazyTextObjectSelector from './lazy-text-object-selector.jsx';
import LocalTagsSelector, { MAP_TO_CLIENT_SEARCH_QUERY } from './local-tags-selector.jsx';
import { clientSearchQueryToDisplayName, isConflictingClientSearchQuery } from '../js/tags.js';
import { ExistingState } from '../page/pages.js';
import { Modals } from '../modal/modals.js';
/** @import {ExistingStateConstRef} from "../page/pages.js" */
/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */
/** @import {DBPermissionedLocalTagService} from '../../db/tags.js' */

/**
 * @param {{
 *  initialSelectedTags?: ClientSearchQuery[]
 *  taggableCursorConstRef: ExistingStateConstRef<string>
 *  onSearchChanged?: (clientSearchQuery: ClientSearchQuery, localTagServiceIDs: number[]) => void
 *  searchType?: "intersect" | "union"
 *  existingState?: ExistingState<{
 *    clientSearchQuery: ClientSearchQuery[]
 *    selectedLocalTagServiceIDs: Set<number>
 *  }>
 * }} param0
 */
const TagsSelector = ({initialSelectedTags, taggableCursorConstRef, onSearchChanged, searchType, existingState}) => {
    const localTagServicesConstRef = User.Global().localTagServicesAvailableRef();
    existingState ??= new ExistingState();
    existingState.initAssign("clientSearchQuery", initialSelectedTags ?? [], {isSaved: true});
    existingState.initAssign("selectedLocalTagServiceIDs", new Set(localTagServicesConstRef.get().map(localTagService => localTagService.Local_Tag_Service_ID)), {isSaved: true});
    onSearchChanged ??= () => {};
    searchType ??= "intersect";

    const onAdd = () => {
        const searchChanged = () => {
            onSearchChanged({
                type: searchType,
                value: existingState.get("clientSearchQuery")
            }, [...existingState.get("selectedLocalTagServiceIDs")]);
        };
        searchChanged();
        let cleanup = () => {};
        cleanup = existingState.addOnUpdateCallbackForKey("clientSearchQuery", searchChanged, cleanup);
        cleanup = existingState.addOnUpdateCallbackForKey("selectedLocalTagServiceIDs", searchChanged, cleanup);
        return cleanup;
    };

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}} onAdd={onAdd}>
            Search:
            <div class="tag-search-query" style={{flex: "3 0 15%"}}>
                <LazyTextObjectSelector
                    textObjectsConstRef={existingState.getConstRef("clientSearchQuery")}
                    onValuesDoubleClicked={((_, indices) => {
                        const clientSearchQuery = existingState.get("clientSearchQuery");
                        for (const index of indices.sort((a, b) => b - a)) {
                            clientSearchQuery.splice(index, 1);
                        }
                        existingState.update("clientSearchQuery", clientSearchQuery);
                    })}
                    customItemComponent={({realizedValue, index}) => (<div style={{width: "100%", position: "relative"}}>
                        <input type="button" style={{position: "absolute", top:0, right: 4}} value="OR" onClick={async () => {
                            let initialSelectedTags = [realizedValue];
                            if (realizedValue.type === "union" || realizedValue.type === "intersect") {
                                initialSelectedTags = [...realizedValue.value];
                            } else {

                            }
                            const orGroupSearchQuery = await Modals.Global().pushModal(CreateOrSearchGroup, {initialSelectedTags});
                            if (orGroupSearchQuery === null || orGroupSearchQuery === undefined) {
                                return;
                            }

                            const clientSearchQuery = existingState.get("clientSearchQuery");
                            if (orGroupSearchQuery.value.length === 0) {
                                clientSearchQuery.splice(index, 1);
                            } else {
                                clientSearchQuery[index] = orGroupSearchQuery;
                            }
                            existingState.update("clientSearchQuery", clientSearchQuery);
                        }} />
                        <div className="lazy-selector-selectable-item-portion" style={{width: "100%", overflowX: "hidden"}}>{clientSearchQueryToDisplayName(realizedValue)}</div>
                    </div>)}
                    customTitleRealizer={(value) => clientSearchQueryToDisplayName(value)}
                />
            </div>
            <div style={{flex: "3 1 100%", height: "80%"}}>
                <LocalTagsSelector 
                    existingState={existingState.getInnerState("localTagsSelector")}
                    localTagServicesConstRef={localTagServicesConstRef}
                    selectedLocalTagServiceIDsRef={existingState.getRef("selectedLocalTagServiceIDs")}
                    taggableCursorConstRef={taggableCursorConstRef}
                    onTagsSelected={(clientQueriesToAdd, isExcludeOn) => {
                        const clientSearchQuery = existingState.get("clientSearchQuery");
                        for (let clientSearchQueryToAdd of clientQueriesToAdd) {
                            /** @type {ClientSearchQuery} */
                            if (isExcludeOn) {
                                clientSearchQueryToAdd = {
                                    type: "complement",
                                    value: clientSearchQueryToAdd
                                };
                            }

                            const sameItemIndex = clientSearchQuery.findIndex(clientSearchQuery => {
                                if (isConflictingClientSearchQuery(clientSearchQuery, clientSearchQueryToAdd)) {
                                    return true;
                                }
                                return false;
                            });

                            if (sameItemIndex !== -1) {
                                const isComplement = clientSearchQuery[sameItemIndex].type === "complement";
                                if (isComplement === isExcludeOn) {
                                    clientSearchQuery.splice(sameItemIndex, 1);
                                } else {
                                    clientSearchQuery[sameItemIndex] = clientSearchQueryToAdd;
                                }
                            } else {
                                clientSearchQuery.push(clientSearchQueryToAdd);
                            }
                        }
                        existingState.update("clientSearchQuery", clientSearchQuery);
                    }}
                    valueMappingFunction={MAP_TO_CLIENT_SEARCH_QUERY}
                />
            </div>
        </div>
    );
};

export default TagsSelector;