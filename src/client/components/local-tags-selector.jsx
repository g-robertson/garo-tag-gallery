import LazyTextObjectSelector from "./lazy-text-object-selector.jsx";
import MultiSelect from "./multi-select.jsx";
import { useEffect } from "react";
import getTagsFromLocalTagServiceIDs from "../../api/client-get/tags-from-local-tag-services.js";
import { User } from "../js/user.js";
import { Modals } from "../modal/modals.js";
import {ExistingState} from "../page/pages.js";

/** @import {ExistingStateRef, ExistingStateConstRef} from "../page/pages.js" */
/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */
/** @import {ClientQueryTag} from "../../api/client-get/tags-from-local-tag-services.js" */
/** @import {ClientSearchQuery} from "../../api/post/search-taggables.js" */
/** @import {MultiSelectOption} from "./multi-select.jsx" */

/**
 * @param {ClientQueryTag[]} clientTags 
 */
export async function MAP_TO_CLIENT_TAGS(clientTags) {
    return clientTags;
}
/**
 * @param {ClientQueryTag[]} clientTags 
 */
export async function MAP_TO_CLIENT_SEARCH_QUERY(clientTags) {
    /** @type {ClientSearchQuery[]} */
    const mapped = [];
    for (let i = clientTags.length - 1; i >= 0; --i) {
        const tag = clientTags[i];
        if (tag.type === "modalTag") {
            const modalTags = await Modals.Global().pushModal(tag.modalTagInfo.modal);
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
 *  existingState?: ExistingState<{
 *    multiSelectOptions: MultiSelectOption<number>[]
 *    selectedLocalTagServiceIDs: number[]
 *    isExcludeOn: boolean
 *    tagFilterValue: string
 *    tagsPreFilter: ClientQueryTag[]
 *    tags: ClientQueryTag[]
 *  }>
 *  localTagServicesConstRef?: ExistingStateConstRef<DBPermissionedLocalTagService[]>
 *  selectedLocalTagServiceIDsRef?: ExistingStateRef<Set<number>>
 *  taggableCursorConstRef: ExistingStateConstRef<string>
 *  taggableIDsConstRef?: ExistingStateConstRef<number[]>
 *  tagsToRemove?: Set<string>
 *  tagsToAdd?: Map<string, ClientQueryTag>
 *  multiSelect?: boolean
 *  excludeable?: boolean
 *  tagSelectionTitle?: string
 *  valueMappingFunction?: (tags: ClientQueryTag[]) => Promise<T[]>
 *  onTagsSelected?: (tags: T[], isExcludeOn: boolean, selectedLocalTagServiceIDs: number[]) => void
 * }} param0
 */
const LocalTagsSelector = ({
    existingState,
    localTagServicesConstRef,
    selectedLocalTagServiceIDsRef,
    taggableIDsConstRef,
    taggableCursorConstRef,
    tagsToRemove,
    tagsToAdd,
    multiSelect,
    excludeable,
    tagSelectionTitle,
    valueMappingFunction,
    onTagsSelected,
}) => {
    localTagServicesConstRef ??= User.Global().localTagServicesAvailableRef();
    existingState ??= new ExistingState();
    // If no provided reference to selection, then create one in this component's state, and save it
    if (selectedLocalTagServiceIDsRef === undefined) {
        existingState.initAssign("selectedLocalTagServiceIDs", new Set(localTagServicesConstRef.get().map(localTagService => localTagService.Local_Tag_Service_ID)), {isSaved: true});
        selectedLocalTagServiceIDsRef = existingState.getRef("selectedLocalTagServiceIDs");
    }
    existingState.initAssign("isExcludeOn", false, {isSaved: true});
    existingState.initAssign("tagFilterValue", "");
    existingState.initAssign("tagsPreFilter", []);
    existingState.initAssign("tags", []);
    taggableCursorConstRef ??= ExistingState.stateRef(undefined);
    taggableIDsConstRef ??= ExistingState.stateRef(undefined);
    tagsToRemove ??= new Set();
    tagsToAdd ??= new Map();
    multiSelect ??= true;
    excludeable ??= true;
    tagSelectionTitle ??= "Select tags";
    valueMappingFunction ??= MAP_TO_CLIENT_TAGS;
    onTagsSelected ??= () => {};

    const onAdd = () => {
        // Updates tags available in tag services
        const onTagsPreFilterCriteriasChanged = async () => {
            existingState.update("tagsPreFilter", await getTagsFromLocalTagServiceIDs([...selectedLocalTagServiceIDsRef.get()], taggableCursorConstRef.get(), taggableIDsConstRef.get()));
        };
        onTagsPreFilterCriteriasChanged();

        // Updates tags allowed to be selected when tag criteria changes (tagsPreFilter, tagFilterValue)
        const onTagCriteriaChanged = () => {
            let tags = existingState.get("tagsPreFilter").filter(tag => !tagsToRemove.has(tag.tagName) && !tagsToAdd.has(tag.tagName) && tag.tagCount !== 0);
            tags.push(...tagsToAdd.values());
            tags = tags.sort((a, b) => b.tagCount - a.tagCount);

            const tagFilterValue = existingState.get("tagFilterValue");
            tags = tags.filter(tag => {
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
            });

            console.log("tags criteria changed", existingState.get("tags"), tags);

            existingState.update("tags", tags);
        };
        onTagCriteriaChanged();

        let cleanup = () => {};
        cleanup = selectedLocalTagServiceIDsRef.addOnUpdateCallback(onTagsPreFilterCriteriasChanged, cleanup);
        cleanup = taggableCursorConstRef.addOnUpdateCallback(onTagsPreFilterCriteriasChanged, cleanup);
        cleanup = existingState.addOnUpdateCallbackForKey("tagsPreFilter", onTagCriteriaChanged, cleanup);
        cleanup = existingState.addOnUpdateCallbackForKey("tagFilterValue", onTagCriteriaChanged, cleanup);
        return cleanup;
    };

    // TODO: Separate out top half of this from the LazyTextObjectSelector
    return (
        <div class="local-tags-selector" style={{flexDirection: "column", width: "100%"}} onAdd={onAdd}>
            <div>Tag services to view/add from:</div>
            <div className="tag-service-selector" style={{flex: 1, overflowY: "auto"}}>
                <MultiSelect
                    optionsConstRef={localTagServicesConstRef.getTransformRef(localTagServices => localTagServices.map(localTagService => ({
                        value: localTagService.Local_Tag_Service_ID,
                        displayName: localTagService.Service_Name
                    })))}
                    selectedOptionsRef={selectedLocalTagServiceIDsRef}
                />
            </div>
            {tagSelectionTitle}:
            <div><input class="tag-filter-input" type="text" onInput={(e) => {
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

                    const isExcludeOn = existingState.get("isExcludeOn");
                    const foundSameTag = existingState.get("tags").find(tag => tag.tagName === displayName);
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

                        onTagsSelected([enteredClientTag], Boolean(isExcludeOn ^ excludeFromTag), selectedLocalTagServiceIDsRef.get());
                    }

                    existingState.update("tagFilterValue", "");
                    e.currentTarget.value = "";
                } else {
                    existingState.update("tagFilterValue", e.currentTarget.value);
                }
            }}/></div>
            {excludeable
                ? <div>Exclude: <input class="exclude-checkbox" type="checkbox" onChange={(e) => {
                    existingState.update("isExcludeOn", e.currentTarget.checked);
                }}/></div>
                : <></>
            }
            
            <div style={{flex: 5}}>
                {<LazyTextObjectSelector
                    textObjectsConstRef={existingState.getConstRef("tags")}
                    onValuesDoubleClicked={async (valuesSelected) => {
                        const mappedValues = await valueMappingFunction(valuesSelected);
                        onTagsSelected(mappedValues, existingState.get("isExcludeOn"), selectedLocalTagServiceIDsRef.get());
                    }}
                    customItemComponent={({realizedValue}) => <>{realizedValue.displayName}{realizedValue.tagCount !== Infinity ? ` (${realizedValue.tagCount})` : ""}</>}
                    customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    multiSelect={multiSelect}
                />}
            </div>
        </div>
    );
}

export default LocalTagsSelector;