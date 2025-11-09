import { useEffect, useState } from 'react';
import '../global.css';
import { PERMISSION_BITS } from '../js/user.js';

import { CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES } from '../modal/modals/create-or-search-group.jsx';
import LazyTextObjectSelector from './lazy-text-object-selector.jsx';
import LocalTagsSelector, { MAP_TO_CLIENT_SEARCH_QUERY } from './local-tags-selector.jsx';
import { clientSearchQueryToDisplayName, isConflictingClientSearchQuery, SYSTEM_LOCAL_TAG_SERVICE } from '../js/tags.js';
/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */
/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */
/** @import {States, Setters} from "../App.jsx" */

/**
 * @param {{
 *  states: States
 *  setters: Setters
 *  initialSelectedTags?: ClientSearchQuery[]
 *  taggableCursor?: string
 *  onSearchChanged?: (clientSearchQuery: ClientSearchQuery, localTagServiceIDs: number[]) => void
 *  searchType?: "intersect" | "union"
 *  existingState?: any
 *  updateExistingStateProp?: (key: string, value: any) => void
 * }} param0
 */
const TagsSelector = ({states, setters, initialSelectedTags, taggableCursor, onSearchChanged, searchType, existingState, updateExistingStateProp}) => {
    existingState ??= {};
    updateExistingStateProp ??= () => {};
    onSearchChanged ??= () => {};
    searchType ??= "intersect";

    /** @type {[ClientSearchQuery[], (clientSearchQuery: ClientSearchQuery[]) => void]} */
    const [clientSearchQuery, setClientSearchQuery] = useState(existingState.clientSearchQuery ?? initialSelectedTags ?? []);
    useEffect(() => {updateExistingStateProp("clientSearchQuery", clientSearchQuery);}, [clientSearchQuery]);

    const localTagServicesAvailable = [SYSTEM_LOCAL_TAG_SERVICE].concat(
        states.user.localTagServices().filter(localTagService => (localTagService.Permission_Extent & PERMISSION_BITS.READ) === PERMISSION_BITS.READ)
    );

    /** @type {number[]} */
    let defaultLocalTagServiceIDsSelected = existingState.localTagServiceIDsSelected ?? localTagServicesAvailable.map(localTagService => localTagService.Local_Tag_Service_ID);
    defaultLocalTagServiceIDsSelected = defaultLocalTagServiceIDsSelected.filter(localTagServiceID => localTagServicesAvailable.some(localTagService => localTagService.Local_Tag_Service_ID === localTagServiceID));
    const [localTagServiceIDsSelected, setLocalTagServiceIDsSelected] = useState(defaultLocalTagServiceIDsSelected);
    useEffect(() => {updateExistingStateProp("localTagServiceIDsSelected", localTagServiceIDsSelected);}, [localTagServiceIDsSelected]);

    useEffect(() => {
        onSearchChanged({
            type: searchType,
            value: clientSearchQuery
        }, localTagServiceIDsSelected);
    }, [clientSearchQuery, localTagServiceIDsSelected]);

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}}>
            Search:
            <div style={{flex: "3 0 15%"}}>
                <LazyTextObjectSelector
                    textObjects={clientSearchQuery}
                    onValuesDoubleClicked={((_, indices) => {
                        for (const index of indices.sort((a, b) => b - a)) {
                            clientSearchQuery.splice(index, 1);
                        }

                        setClientSearchQuery([...clientSearchQuery]);
                    })}
                    customItemComponent={({realizedValue, index}) => (<div style={{width: "100%", position: "relative"}}>
                        <input type="button" style={{position: "absolute", top:0, right: 4}} value="OR" onClick={async () => {
                            let initialSelectedTags = [realizedValue];
                            if (realizedValue.type === "union" || realizedValue.type === "intersect") {
                                initialSelectedTags = [...realizedValue.value];
                            } else {

                            }
                            const orGroupSearchQuery = await setters.pushModal(CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {initialSelectedTags});
                            if (orGroupSearchQuery === null || orGroupSearchQuery === undefined) {
                                return;
                            }

                            if (orGroupSearchQuery.value.length === 0) {
                                clientSearchQuery.splice(index, 1);
                            } else {
                                clientSearchQuery[index] = orGroupSearchQuery;
                            }
                            setClientSearchQuery([...clientSearchQuery]);
                        }} />
                        <div className="lazy-selector-selectable-item-portion" style={{width: "100%", overflowX: "hidden"}}>{clientSearchQueryToDisplayName(realizedValue)}</div>
                    </div>)}
                    customTitleRealizer={(value) => clientSearchQueryToDisplayName(value)}
                />
            </div>
            <div style={{flex: "3 1 100%", height: "80%"}}>
                <LocalTagsSelector 
                    states={states}
                    setters={setters}
                    taggableCursor={taggableCursor}
                    localTagServices={localTagServicesAvailable}
                    onLocalTagServiceIDsChanged={localTagServiceIDs => {
                        setLocalTagServiceIDsSelected(localTagServiceIDs);
                    }}
                    defaultLocalTagServiceIDsSelected={defaultLocalTagServiceIDsSelected}
                    onTagsSelected={(clientQueriesToAdd, isExcludeOn) => {
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
                        setClientSearchQuery([...clientSearchQuery]);
                    }}
                    valueMappingFunction={MAP_TO_CLIENT_SEARCH_QUERY}
                />
            </div>
        </div>
    );
};

export default TagsSelector;