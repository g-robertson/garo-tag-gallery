import { useEffect, useState } from 'react';
import '../global.css';
import { PERMISSION_BITS, User } from '../js/user.js';
import { fjsonParse } from '../js/client-util.js';
import MultiSelect from './multi-select.jsx';

import { MODAL_NAME as CREATE_OR_SEARCH_GROUP_MODAL_NAME } from '../modal/modals/create-or-search-group.jsx';
import LazyTagSelector from './lazy-tag-selector.jsx';

/**
 * @typedef {Object} ClientTag
 * @property {number} localTagID
 * @property {string} tagName
 * @property {string} displayName
 * @property {string[]} namespaces
 */

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
 *  searchObjectsRef?: {current: Map<string, SearchObject>}
 *  onSearchChanged?: (searchObjects: SearchObject[]) => void
 * }} param0
 */
const TagsSelector = ({user, pushModal, initialSelectedTags, searchObjectsRef, onSearchChanged}) => {
    searchObjectsRef ??= {};
    onSearchChanged ??= () => {};

    /** @type {[Map<string, SearchObject>, (searchObjects: Map<string, SearchObject>) => void]} */
    const [searchObjects, setSearchObjects] = useState(initialSelectedTags ?? new Map());
    searchObjectsRef.current = searchObjects;

    /** @type {[ClientTag[], (tags: ClientTag[]) => void]} */
    const [tags, setTags] = useState([]);
    /** @type {[string, (tagFilterValue: string) => void]} */
    const [tagFilterValue, setTagFilterValue] = useState("");
    const [isExcludeOn, setIsExcludeOn] = useState(false);

    useEffect(() => {
        onSearchChanged([...searchObjects.values()]);
    }, [searchObjects]);

    const readableLocalTagServices = user.localTagServices().filter(localTagService => (localTagService.Permission_Extent & PERMISSION_BITS.READ) === PERMISSION_BITS.READ);

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}}>
            <div>Tag services to view:</div>
            <div style={{flex: 1}}>
                <MultiSelect options={[
                    ...readableLocalTagServices.map(localTagService => ({
                        value: localTagService.Local_Tag_Service_ID.toString(),
                        displayName: localTagService.Service_Name
                    }))
                ]} onOptionsChange={async (optionsSelected) => {
                    const response = await fetch("/api/post/tags-from-local-tag-services", {
                        body: JSON.stringify({
                            localTagServiceIDs: optionsSelected.map(option => Number(option))
                        }),
                        headers: {
                          "Content-Type": "application/json",
                        },
                        method: "POST"
                    });

                    const tagsResponse = await fjsonParse(response);

                    setTags(tagsResponse.map(tag => ({
                        localTagID: tag[0],
                        displayName: tag[1],
                        tagName: tag[2],
                        namespaces: tag[3]
                    })));
                }}/>
            </div>
            Search:
            <div style={{flex: 2}}>
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
                            const orGroupSearchObjects = await pushModal(CREATE_OR_SEARCH_GROUP_MODAL_NAME, {initialSelectedTags: new Map(
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

            Select Tags:
            <div>Tag filter: <input type="text" value={tagFilterValue} onChange={(e) => {
                setTagFilterValue(e.currentTarget.value);
            }}/></div>
            <div>Exclude: <input type="checkbox" checked={isExcludeOn} onChange={() => {
                setIsExcludeOn(!isExcludeOn);
            }}/></div>
            <div style={{flex: 5}}>
                <LazyTagSelector
                    tags={
                        tags.filter(tag => {
                            if (tagFilterValue === "") {
                                return true;
                            }
                            if (tag.tagName.startsWith(tagFilterValue)) {
                                return true;
                            }
                            for (const namespace of tag.namespaces) {
                                if (namespace.startsWith(tagFilterValue)) {
                                    return true;
                                }
                            }

                            return false;
                        })
                    }
                    onValuesDoubleClicked={(valuesSelected) => {
                        for (const tag of valuesSelected) {
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
                    customItemComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                    customTitleRealizer={(value) => value.displayName}
                />
            </div>
        </div>
    );
};

export default TagsSelector;