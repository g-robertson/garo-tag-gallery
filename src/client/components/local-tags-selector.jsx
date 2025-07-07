import LazyTextObjectSelector from "./lazy-text-object-selector.jsx";
import MultiSelect from "./multi-select.jsx";
import { useEffect, useState } from "react";
import getTagsFromLocalTagServiceIDs from "../../api/client-get/tags-from-local-tag-services.js";
import { FetchCache } from "../js/client-util.js";

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */
/** @import {ClientQueryTag} from "../../api/client-get/tags-from-local-tag-services.js" */
/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */

/**
 * @param {ClientQueryTag[]} clientTags 
 */
export async function MAP_TO_CLIENT_TAGS(clientTags) {
    return clientTags;
}
/**
 * @param {ClientQueryTag[]} clientTags 
 * @param {(modalName: string, extraProperties: any) => Promise<any>} pushModal
 */
export async function MAP_TO_CLIENT_SEARCH_QUERY(clientTags, pushModal) {
    /** @type {ClientSearchQuery[]} */
    const mapped = [];
    for (let i = clientTags.length - 1; i >= 0; --i) {
        const tag = clientTags[i];
        if (tag.type === "modalTag") {
            const modalTags = await pushModal(tag.modalTagInfo.modalName);
            if (modalTags !== undefined && modalTags !== null) {
                mapped.push(modalTags);
            }
        } else {
            mapped.push(tag);
        }
    }

    return mapped.reverse();
}

/**
 * @template {any} [T=ClientQueryTag]
 * @param {{
 *  fetchCache: FetchCache
 *  localTagServices: DBPermissionedLocalTagService[]
 *  taggableIDs?: number[]
 *  tagsToRemove?: Set<string>
 *  tagsToAdd?: Map<string, ClientQueryTag>
 *  defaultLocalTagServiceIDsSelected?: number[]
 *  multiSelect?: boolean
 *  excludeable?: boolean
 *  tagSelectionTitle?: string
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  valueMappingFunction?: (tags: ClientQueryTag[], pushModal: (modalName: string, extraProperties: any) => Promise<any>) => Promise<T[]>
 *  onTagsSelected?: (tags: T[], isExcludeOn: boolean, localTagServiceIDsSelected: number[]) => void
 *  onLocalTagServiceIDsChanged?: (localTagServiceIDsSelected: number[]) => void
 * }} param0
 */
const LocalTagsSelector = ({
    fetchCache,
    localTagServices,
    taggableIDs,
    tagsToRemove,
    tagsToAdd,
    defaultLocalTagServiceIDsSelected,
    multiSelect,
    excludeable,
    tagSelectionTitle,
    pushModal,
    valueMappingFunction,
    onTagsSelected,
    onLocalTagServiceIDsChanged
}) => {
    tagsToRemove ??= new Set();
    tagsToAdd ??= new Set();
    multiSelect ??= true;
    excludeable ??= true;
    tagSelectionTitle ??= "Select tags";
    valueMappingFunction ??= MAP_TO_CLIENT_TAGS;
    onTagsSelected ??= () => {};
    onLocalTagServiceIDsChanged ??= () => {};
    defaultLocalTagServiceIDsSelected ??= localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID);

    /** @type {[ClientQueryTag[], (tags: ClientQueryTag[]) => void]} */
    const [tagsPreFilter, setTagsPreFilter] = useState([]);
    /** @type {[string, (tagFilterValue: string) => void]} */
    const [tagFilterValue, setTagFilterValue] = useState("");
    /** @type {[boolean, (isExcludeOn: boolean) => void]} */
    const [isExcludeOn, setIsExcludeOn] = useState(false);
    /** @type {[number[], (localTagServiceIDsSelected: number[]) => void]} */
    const [localTagServiceIDsSelected, setLocalTagServiceIDsSelected] = useState(defaultLocalTagServiceIDsSelected);

    let tags = tagsPreFilter.filter(tag => !tagsToRemove.has(tag.tagName) && !tagsToAdd.has(tag.tagName) && tag.tagCount !== 0);
    tags.push(...tagsToAdd.values());

    tags = tags.sort((a, b) => b.tagCount - a.tagCount)

    useEffect(() => {
        (async () => {
            setTagsPreFilter(await getTagsFromLocalTagServiceIDs(localTagServiceIDsSelected, taggableIDs, fetchCache));
        })();
    }, [localTagServiceIDsSelected, taggableIDs, fetchCache]);

    useEffect(() => {
        onLocalTagServiceIDsChanged(localTagServiceIDsSelected);
    }, [localTagServiceIDsSelected]);

    // TODO: Separate out top half of this from the LazyTextObjectSelector
    return (
        <div style={{flexDirection: "column", width: "100%"}}>
            <div>Tag services to view/add from:</div>
            <div style={{flex: 1, overflowY: "auto"}}>
                <MultiSelect
                    options={localTagServices.map((localTagService, i) => ({
                        value: localTagService.Local_Tag_Service_ID,
                        displayName: localTagService.Service_Name
                    }))}
                    defaultOptionsSelected={defaultLocalTagServiceIDsSelected}
                    onOptionsChange={async (optionsSelected) => {
                        setLocalTagServiceIDsSelected(optionsSelected.map(option => Number(option)));
                    }}
                />
            </div>
            {tagSelectionTitle}:
            <div><input type="text" value={tagFilterValue} onChange={(e) => {
                setTagFilterValue(e.currentTarget.value);
            }} onKeyDown={(e) => {
                if (e.key === "Enter") {
                    let displayName = e.currentTarget.value;
                    if (displayName === "") {
                        return;
                    }

                    const lastColonIndex = displayName.lastIndexOf(":");
                    
                    let excludeFromTag = false;
                    if (displayName[0] === '-') {
                        excludeFromTag = true;
                        displayName = displayName.slice(1);
                    }

                    let namespaces = [];
                    let tagName = displayName;


                    if (lastColonIndex !== -1) {
                        namespaces = displayName.slice(0, lastColonIndex).split(":");
                        tagName = displayName.slice(lastColonIndex + 1);
                    }

                    const foundSameTag = tags.find(tag => tag.tagName === displayName);
                    if (foundSameTag !== undefined) {
                        onTagsSelected([foundSameTag], Boolean(isExcludeOn ^ excludeFromTag));
                    } else {
                        /** @type {ClientQueryTag} */
                        const enteredClientTag = {
                            displayName,
                            tagName,
                            namespaces,
                            tagCount: Infinity,
                            type: "tagByLookup",
                            Lookup_Name: tagName
                        };

                        onTagsSelected([enteredClientTag], Boolean(isExcludeOn ^ excludeFromTag), localTagServiceIDsSelected);
                    }

                    setTagFilterValue("");
                }
            }}/></div>
            {excludeable
                ? <div>Exclude: <input type="checkbox" checked={isExcludeOn} onChange={() => {
                    setIsExcludeOn(!isExcludeOn);
                }}/></div>
                : <></>
            }
            
            <div style={{flex: 5}}>
                <LazyTextObjectSelector
                    textObjects={
                        tags.filter(tag => {
                            if (tag.tagCount === 0) {
                                return false;
                            }
                            
                            const colonSplitTagFilter = tagFilterValue.split(':');
                            let tagNameMatchedPartsFrom = colonSplitTagFilter.length;
                            for (let i = 0; i < colonSplitTagFilter.length; ++i) {
                                if (tag.tagName.startsWith(colonSplitTagFilter.slice(i).join(':'))) {
                                    tagNameMatchedPartsFrom = i;
                                    break;
                                }
                            }

                            const namespaceParts = colonSplitTagFilter.slice(0, Math.min(colonSplitTagFilter.length - 1, tagNameMatchedPartsFrom));
                            for (const namespacePart of namespaceParts) {
                                if (tag.namespaces.indexOf(namespacePart) === -1) {
                                    return false;
                                }
                            }
                            if (tagNameMatchedPartsFrom === colonSplitTagFilter.length) {
                                let namespacePartialMatch = false;
                                for (const namespace of tag.namespaces) {
                                    if (namespace.startsWith(colonSplitTagFilter[colonSplitTagFilter.length - 1])) {
                                        namespacePartialMatch = true;
                                    }
                                }
                                if (!namespacePartialMatch) {
                                    return false;
                                }
                            }

                            return true;
                        })
                    }
                    onValuesDoubleClicked={async (valuesSelected) => {
                        const mappedValues = await valueMappingFunction(valuesSelected, pushModal);
                        onTagsSelected(mappedValues, isExcludeOn, localTagServiceIDsSelected);
                    }}
                    customItemComponent={({realizedValue}) => <>{realizedValue.displayName}{realizedValue.tagCount !== Infinity ? ` (${realizedValue.tagCount})` : ""}</>}
                    customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    multiSelect={multiSelect}
                />
            </div>
        </div>
    );
}

export default LocalTagsSelector;