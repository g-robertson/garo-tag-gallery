import { useEffect, useState } from 'react';
import '../global.css';
import { PERMISSION_BITS, User } from '../js/user.js';

import { CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES } from '../modal/modals/create-or-search-group.jsx';
import LazyTextObjectSelector from './lazy-text-object-selector.jsx';
import LocalTagsSelector, { MAP_TO_CLIENT_SEARCH_QUERY } from './local-tags-selector.jsx';
import { clientSearchQueryToDisplayName } from '../js/tags.js';

/** @import {ClientTag} from "./local-tags-selector.jsx" */
/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */

/**
 * @param {{
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  initialSelectedTags?: ClientSearchQuery[]
 *  onSearchChanged?: (clientSearchQuery: ClientSearchQuery) => void
 *  searchType?: "intersect" | "union"
 *  existingState?: any
 * }} param0
 */
const TagsSelector = ({user, pushModal, initialSelectedTags, onSearchChanged, searchType, existingState}) => {
    existingState ??= {};
    onSearchChanged ??= () => {};
    searchType ??= "intersect";

    /** @type {[ClientSearchQuery[], (clientSearchQuery: ClientSearchQuery[]) => void]} */
    const [clientSearchQuery, setClientSearchQuery] = useState(existingState.clientSearchQuery ?? initialSelectedTags ?? []);
    useEffect(() => {existingState.clientSearchQuery = clientSearchQuery;}, [clientSearchQuery]);
    

    useEffect(() => {
        onSearchChanged({
            type: searchType,
            value: clientSearchQuery
        });
    }, [clientSearchQuery]);

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}}>
            Search:
            <div style={{flex: 1}}>
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
                            const orGroupSearchQuery = await pushModal(CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {initialSelectedTags});
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
            <div style={{flex: 3}}>
                <LocalTagsSelector 
                    localTagServices={user.localTagServices().filter(localTagService => (localTagService.Permission_Extent & PERMISSION_BITS.READ) === PERMISSION_BITS.READ)}
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
                                if (clientSearchQuery.type === "tagByLocalTagID" && clientSearchQuery.localTagID === clientSearchQueryToAdd.localTagID) {
                                    return true;
                                }
                                if (clientSearchQuery.type === "complement" && clientSearchQuery.value.type === "tagByLocalTagID" && clientSearchQuery.value.localTagID === clientSearchQueryToAdd.localTagID) {
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
                    pushModal={pushModal}
                />
            </div>
        </div>
    );
};

export default TagsSelector;