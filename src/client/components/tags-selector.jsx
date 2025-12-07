import '../global.css';
import { User } from '../js/user.js';

import CreateOrSearchGroup from '../modal/modals/create-or-search-group.jsx';
import LazyTextObjectSelector from './lazy-text-object-selector.jsx';
import LocalTagsSelector, { MAP_TO_CLIENT_SEARCH_QUERY } from './local-tags-selector.jsx';
import { clientSearchQueryToDisplayName, isConflictingClientSearchQuery } from '../js/tags.js';
import { PersistentState, State } from '../page/pages.js';
import { Modals } from '../modal/modals.js';
import { executeFunctions } from '../js/client-util.js';
/** @import {ConstState} from "../page/pages.js" */
/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */
/** @import {DBPermissionedLocalTagService} from '../../db/tags.js' */

/**
 * @param {{
 *  initialSelectedTags?: ClientSearchQuery[]
 *  taggableCursorConstState: ConstState<string>
 *  onSearchChanged?: (clientSearchQuery: ClientSearchQuery, localTagServiceIDs: number[]) => void
 *  searchType?: "intersect" | "union"
 *  persistentState?: PersistentState
 * }} param0
 */
const TagsSelector = ({initialSelectedTags, taggableCursorConstState, onSearchChanged, searchType, persistentState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const localTagServicesConstState = User.Global().localTagServicesAvailableState(addToCleanup);
    persistentState ??= new PersistentState();
    /** @type {State<ClientSearchQuery[]>} */
    const clientSearchQueryState = persistentState.registerState("clientSearchQuery", new State(initialSelectedTags ?? []), {isSaved: true, addToCleanup});
    /** @type {State<Set<number>>} */
    const selectedLocalTagServiceIDsState = persistentState.registerState(
        "selectedLocalTagServiceIDs",
        new State(new Set(localTagServicesConstState.get().map(localTagService => localTagService.Local_Tag_Service_ID))),
        {isSaved: true, addToCleanup}
    );
    onSearchChanged ??= () => {};
    searchType ??= "intersect";

    const onAdd = () => {
        const searchChanged = () => {
            onSearchChanged({
                type: searchType,
                value: clientSearchQueryState.get()
            }, [...selectedLocalTagServiceIDsState.get()]);
        };
        searchChanged();

        clientSearchQueryState.addOnUpdateCallback(searchChanged, addToCleanup);
        selectedLocalTagServiceIDsState.addOnUpdateCallback(searchChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}} onAdd={onAdd}>
            Search:
            <div class="tag-search-query" style={{flex: "3 0 15%"}}>
                <LazyTextObjectSelector
                    textObjectsConstState={clientSearchQueryState.asConst()}
                    onValuesDoubleClicked={((_, indices) => {
                        const clientSearchQuery = clientSearchQueryState.get();
                        for (const index of indices.sort((a, b) => b - a)) {
                            clientSearchQuery.splice(index, 1);
                        }
                        clientSearchQueryState.forceUpdate();
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

                            const clientSearchQuery = clientSearchQueryState.get();
                            if (orGroupSearchQuery.value.length === 0) {
                                clientSearchQuery.splice(index, 1);
                            } else {
                                clientSearchQuery[index] = orGroupSearchQuery;
                            }
                            clientSearchQueryState.forceUpdate();
                        }} />
                        <div className="lazy-selector-selectable-item-portion" style={{width: "100%", overflowX: "hidden"}}>{clientSearchQueryToDisplayName(realizedValue)}</div>
                    </div>)}
                    customTitleRealizer={(value) => clientSearchQueryToDisplayName(value)}
                />
            </div>
            <div style={{flex: "3 1 100%", height: "80%"}}>
                <LocalTagsSelector 
                    persistentState={persistentState.registerState("localTagsSelector", new PersistentState())}
                    localTagServicesConstState={localTagServicesConstState}
                    selectedLocalTagServiceIDsState={selectedLocalTagServiceIDsState}
                    taggableCursorConstState={taggableCursorConstState}
                    onTagsSelected={(clientQueriesToAdd, isExcludeOn) => {
                        const clientSearchQuery = clientSearchQueryState.get();
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
                        clientSearchQueryState.forceUpdate();
                    }}
                    valueMappingFunction={MAP_TO_CLIENT_SEARCH_QUERY}
                />
            </div>
        </div>
    );
};

export default TagsSelector;