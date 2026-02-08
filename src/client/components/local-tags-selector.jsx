import LazyTextObjectSelector from "./lazy-text-object-selector.jsx";
import MultiSelect from "./multi-select.jsx";
import { User } from "../js/user.js";
import { Modals } from "../modal/modals.js";
import { PersistentState, State, ConstState } from "../js/state.js";
import { executeFunctions, mapUnion } from "../js/client-util.js";
import { FetchCache } from "../js/fetch-cache.js";

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
            const modalTags = await Modals.Global().pushModal(tag.modalTagInfo.modal());
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
 *  persistentState?: PersistentState
 *  localTagServicesConstState?: ConstState<DBPermissionedLocalTagService[]>
 *  selectedLocalTagServiceIDsState?: State<Set<number>>
 *  taggableCursorConstState: ConstState<string>
 *  taggableIDsConstState?: ConstState<number[]>
 *  tagsToRemoveConstState?: ConstState<Map<number, Set<string>>>
 *  tagsToAddConstState?: ConstState<Map<number, Map<string, ClientQueryTag>>>
 *  multiSelect?: boolean
 *  excludeable?: boolean
 *  tagSelectionTitle?: string
 *  valueMappingFunction?: (tags: ClientQueryTag[]) => Promise<T[]>
 *  onTagsSelected?: (tags: T[], isExcludeOn: boolean, selectedLocalTagServiceIDs: number[]) => void
 * }} param0
 */
const LocalTagsSelector = ({
    persistentState,
    localTagServicesConstState,
    selectedLocalTagServiceIDsState,
    taggableIDsConstState,
    taggableCursorConstState,
    tagsToRemoveConstState,
    tagsToAddConstState,
    multiSelect,
    excludeable,
    tagSelectionTitle,
    valueMappingFunction,
    onTagsSelected,
}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    localTagServicesConstState ??= User.Global().localTagServicesAvailableState();
    persistentState ??= new PersistentState();
    
    selectedLocalTagServiceIDsState = persistentState.registerState(
        "selectedLocalTagServiceIDs",
        selectedLocalTagServiceIDsState ?? new State(new Set(localTagServicesConstState.get().map(localTagService => localTagService.Local_Tag_Service_ID)), {name: "LocalTagsSelector.selectedLocalTagServiceIDsState"}),
        {isSaved: true, addToCleanup}
    );
    const isExcludeOnState = persistentState.registerState("isExcludeOn", new State(false, {name: "LocalTagsSelector.isExcludeOnState"}), {isSaved: true, addToCleanup});
    const tagFilterValueState = persistentState.registerState("tagFilterValue", new State("", {name: "LocalTagsSelector.tagFilterValueState"}), {addToCleanup});
    /** @type {State<ClientQueryTag[]>} */
    const tagsState = persistentState.registerState("tags", new State([]), {addToCleanup});
    taggableCursorConstState ??= new State(undefined, {name: "LocalTagsSelector.taggableCursorConstState"});
    taggableIDsConstState ??= new State(undefined, {name: "LocalTagsSelector.taggableIDsConstState"});
    tagsToRemoveConstState ??= new State(new Map(), {name: "LocalTagsSelector.tagsToRemoveConstState"});
    tagsToAddConstState ??= new State(new Map(), {name: "LocalTagsSelector.tagsToAddConstState"});
    const tagsPreFilter = FetchCache.Global().getTagsFromLocalTagServiceIDsConstState(
        selectedLocalTagServiceIDsState.asTransform(selectedLocalTagServiceIDs => [...selectedLocalTagServiceIDs], addToCleanup),
        taggableCursorConstState,
        taggableIDsConstState,
        addToCleanup,
        {updateOnCreate: true}
    );
    multiSelect ??= true;
    excludeable ??= true;
    tagSelectionTitle ??= "Select tags";
    valueMappingFunction ??= MAP_TO_CLIENT_TAGS;
    onTagsSelected ??= () => {};

    const onAdd = () => {

        // Updates tags allowed to be selected when tag criteria changes (tagsPreFilter, tagFilterValue)
        const onTagCriteriaChanged = () => {
            const tagsToAdd = mapUnion(
                [...tagsToAddConstState.get()]
                .filter(([localTagServiceID,]) => selectedLocalTagServiceIDsState.get().has(localTagServiceID))
                .map(([, tags]) => tags)
            );
            const tagsToRemove = tagsToRemoveConstState.get();
            tagsPreFilter.getWhenValid().then(tags => {
                tags = tags.filter(tag => {
                    if (tagsToAdd.has(tag.tagName) || tag.tagCount === 0) {
                        return false;
                    }
                    // if every local tag service id on the tag has the tag removed, then it's removed
                    if (tag.localTagServiceIDs.every(localTagServiceID => tagsToRemove.get(localTagServiceID)?.has(tag.tagName))) {
                        return false;
                    }

                    return true;
                });
                tags.push(...tagsToAdd.values());
                tags = tags.sort((a, b) => b.tagCount - a.tagCount);

                const tagFilterValue = tagFilterValueState.get();
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

                tagsState.set(tags);
            });
        };
        onTagCriteriaChanged();

        tagsPreFilter.addOnUpdateCallback(onTagCriteriaChanged, addToCleanup, {whenInvalidSubstitute: "no-update"});
        tagFilterValueState.addOnUpdateCallback(onTagCriteriaChanged, addToCleanup);
        tagsToAddConstState.addOnUpdateCallback(onTagCriteriaChanged, addToCleanup);
        tagsToRemoveConstState.addOnUpdateCallback(onTagCriteriaChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };

    return (
        <div onAdd={onAdd} class="local-tags-selector" style={{flexDirection: "column", width: "100%"}}>
            <div>Tag services to view/add from:</div>
            <div className="tag-service-selector" style={{flex: 1, overflowY: "auto"}}>
                <MultiSelect
                    optionsConstState={localTagServicesConstState.asTransform(localTagServices => localTagServices.map(localTagService => ({
                        value: localTagService.Local_Tag_Service_ID,
                        displayName: localTagService.Service_Name
                    })), addToCleanup)}
                    selectedOptionsState={selectedLocalTagServiceIDsState}
                />
            </div>
            {tagSelectionTitle}:
            <div><input class="tag-filter-input" type="text" onKeyUp={(e) => {
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

                    const isExcludeOn = isExcludeOnState.get();
                    const foundSameTag = tagsState.get().find(tag => tag.tagName === displayName);
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

                        onTagsSelected([enteredClientTag], Boolean(isExcludeOn ^ excludeFromTag), selectedLocalTagServiceIDsState.get());
                    }

                    tagFilterValueState.set("");
                    e.currentTarget.value = "";
                }
            }} onInput={(e) => {
                tagFilterValueState.set(e.currentTarget.value);
            }}/></div>
            {excludeable
                ? <div>Exclude: <input class="exclude-checkbox" type="checkbox" checked={isExcludeOnState.get()} onChange={(e) => {
                    isExcludeOnState.set(e.currentTarget.checked);
                }}/></div>
                : <></>
            }
            
            <div style={{flex: 5}}>
                {<LazyTextObjectSelector
                    textObjectsConstState={tagsState.asConst()}
                    onValuesDoubleClicked={async (valuesSelected) => {
                        const mappedValues = await valueMappingFunction(valuesSelected);
                        onTagsSelected(mappedValues, isExcludeOnState.get(), selectedLocalTagServiceIDsState.get());
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