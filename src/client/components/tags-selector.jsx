import { useEffect, useState } from 'react';
import '../global.css';
import { PERMISSION_BITS, User } from '../js/user.js';

import { MODAL_PROPERTIES as CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES } from '../modal/modals/create-or-search-group.jsx';
import LazyTagSelector from './lazy-tag-selector.jsx';
import LocalTagsSelector from './local-tags-selector.jsx';

/** @import {ClientTag} from "./local-tags-selector.jsx" */

/**
 * @typedef {ClientTag & {
 *     exclude: boolean
 * }} SearchTag
 */

/**
 * @typedef {(SearchTag | SearchObject)[]} SearchObject
 */

/**
 * @param {SearchObject | SearchTag} searchObject
 * @returns {string}
 */
function searchObjectToHash(searchObject) {
    if (searchObject instanceof Array) {
        return searchObject.map(innerSearchObject => searchObjectToHash(innerSearchObject)).join('\x01');
    }

    return `${(searchObject.exclude ? '\x02' : '\x03')}${searchObject.localTagID}`;
}

/**
 * @param {SearchObject | SearchTag} searchObject 
 */
function searchObjectToDisplayName(searchObject) {
    if (searchObject instanceof Array) {
        if (searchObject.length === 1) {
            return searchObjectToDisplayName(searchObject[0]);
        } else {
            return `OR: ${searchObject.map(innerSearchObject => searchObjectToDisplayName(innerSearchObject)).join(' ')}`;
        }
    }

    return `${(searchObject.exclude ? '-' : '')}${searchObject.displayName}`;

}

/**
 * @param {{
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  initialSelectedTags?: Map<string, SearchObject>
 *  searchObjectsOut?: {out: Map<string, SearchObject>}
 *  onSearchChanged?: (searchObjects: SearchObject[]) => void
 *  existingState?: any
 * }} param0
 */
const TagsSelector = ({user, pushModal, initialSelectedTags, searchObjectsOut, onSearchChanged, existingState}) => {
    existingState ??= {};
    searchObjectsOut ??= {};
    onSearchChanged ??= () => {};

    /** @type {[Map<string, SearchObject>, (searchObjects: Map<string, SearchObject>) => void]} */
    const [searchObjects, setSearchObjects] = useState(existingState.searchObjects ?? initialSelectedTags ?? new Map());
    useEffect(() => {existingState.searchObjects = searchObjects;}, [searchObjects]);
    searchObjectsOut.out = searchObjects;

    useEffect(() => {
        onSearchChanged([...searchObjects.values()]);
    }, [searchObjects]);

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}}>
            Search:
            <div style={{flex: 1}}>
                <LazyTagSelector
                    tags={[...searchObjects.values()].map(searchObject => {
                        return searchObject;
                    })}
                    onValuesDoubleClicked={(searchObjects_ => {
                        for (const searchObject of searchObjects_) {
                            searchObjects.delete(searchObjectToHash(searchObject));
                        }

                        setSearchObjects(new Map([...searchObjects]));
                    })}
                    customItemComponent={({realizedValue}) => (<div style={{width: "100%", position: "relative"}}>
                        <input type="button" style={{position: "absolute", top:0, right: 4}} value="OR" onClick={async () => {
                            const orGroupSearchObjects = await pushModal(CREATE_OR_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {initialSelectedTags: new Map(
                                realizedValue.map(tag => [searchObjectToHash([tag]), [tag]])
                            )});
                            if (orGroupSearchObjects === undefined) {
                                return;
                            }

                            searchObjects.delete(searchObjectToHash(realizedValue));
                            if (orGroupSearchObjects.length !== 0) {
                                searchObjects.set(searchObjectToHash(orGroupSearchObjects), orGroupSearchObjects);
                            }

                            setSearchObjects(new Map([...searchObjects]));
                        }} />
                        <div className="lazy-selector-selectable-item-portion" style={{width: "100%", overflowX: "hidden"}}>{searchObjectToDisplayName(realizedValue)}</div>
                    </div>)}
                    customTitleRealizer={(value) => searchObjectToDisplayName(value)}
                />
            </div>
            <div style={{flex: 3}}>
                <LocalTagsSelector 
                    localTagServices={user.localTagServices().filter(localTagService => (localTagService.Permission_Extent & PERMISSION_BITS.READ) === PERMISSION_BITS.READ)}
                    onTagsSelected={(tags, isExcludeOn) => {
                        for (const tag of tags) {
                            const searchObject = [{
                                ...tag,
                                exclude: isExcludeOn
                            }];

                            const searchObjectHash = searchObjectToHash(searchObject);
                            if (searchObjects.has(searchObjectHash)) {
                                searchObjects.delete(searchObjectHash);
                            } else {
                                const oppositeExcludedVersion = [{
                                    ...tag,
                                    exclude: !isExcludeOn
                                }];
                                const oppositeExcludedVersionHash = searchObjectToHash(oppositeExcludedVersion)
                                searchObjects.delete(oppositeExcludedVersionHash);

                                searchObjects.set(searchObjectHash, searchObject);
                            }

                        }
                        setSearchObjects(new Map([...searchObjects]));
                    }}
                />
            </div>
        </div>
    );
};

export default TagsSelector;