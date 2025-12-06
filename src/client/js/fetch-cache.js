import { searchTaggables } from "../../api/client-get/search-taggables.js";
import selectFiles from "../../api/client-get/select-files.js";
import getTagsFromLocalTagServiceIDs from "../../api/client-get/tags-from-local-tag-services.js";
import { State, ConstState } from "../page/pages.js";
import { RealizationMap } from "./client-util.js";

/** @typedef {"tags" | "taggables" | "files"} ResettableCacheType */
/**
 * @typedef {Object} FetchCacheOptions
 * @property {any} initialValue
 * @property {boolean=} waitForSet
 */

/**
 * @param {{
 *     resetsWith?: Set<ResettableCacheType>
 * }} options 
 */
function CacheProperty(options) {
    return options;
}

const CachePropertiesArray = /** @type {const} */ ([
    ["getTagsFromLocalTagServiceIDs", CacheProperty({resetsWith: new Set(["tags", "taggables"])})],
    ["searchTaggables", CacheProperty({resetsWith: new Set(["taggables"])})],
    ["select-file-comparisons", CacheProperty({resetsWith: new Set(["files"])})],
    ["selectFiles", CacheProperty({resetsWith: new Set(["taggables"])})],
]);
const CacheProperties = new Map(CachePropertiesArray);

/** @typedef {(typeof CachePropertiesArray)[number][0]} Endpoint */

export class FetchCache {
    #cache = new Map(CachePropertiesArray.map(([endpoint,]) => [
        endpoint, {
            /** @type {RealizationMap<string, any>} */
            values: new RealizationMap(),
            state: new State()
        }
    ]));

    static #Gl_FetchCache = new FetchCache();

    static Global() {
        return FetchCache.#Gl_FetchCache;
    }

    /**
     * @param {ResettableCacheType} cacheType 
     */
    resetCacheType(cacheType) {
        for (const [cacheName, cache] of this.#cache) {
            if (CacheProperties.get(cacheName).resetsWith.has(cacheType)) {
                cache.values.clear();
                cache.state.forceUpdate();
            }
        }
    }

    /**
     * @template HashMethod, ApiMethod
     * @param {ConstState<any>[]} constStates 
     * @param {Endpoint} cacheName 
     * @param {HashMethod} hasher 
     * @param {ApiMethod} apiMethod
     * @param {(() => void)[]} addToCleanup
     * @param {FetchCacheOptions} options
     * @returns {ConstState<Awaited<ReturnType<ApiMethod>>>}
     */
    #apiCallConstState(constStates, cacheName, hasher, apiMethod, addToCleanup, options) {
        const cache = this.#cache.get(cacheName);
        return State.asyncTupleTransform([
            ...constStates,
            cache.state
        ], async () => {
            const values = constStates.map(ref => ref.get());
            const hash = hasher(...values);
            if (cache.values.getStatus(hash) === "empty") {
                cache.values.setAwaiting(hash);
                cache.values.set(hash, await apiMethod(...values));
            }
            const returned = await cache.values.get(hash);
            return returned;
        }, addToCleanup, options);
    }

    /**
     * @param {number[]} localTagServiceIDs
     * @param {string=} taggableCursor
     * @param {number[]=} taggableIDs
     */
    static #getTagsFromLocalTagServiceIDsHash(localTagServiceIDs, taggableCursor, taggableIDs) {
        taggableCursor ??= "";
        taggableIDs ??= [];
        return `${localTagServiceIDs.join("\x01")}\x02${taggableCursor}\x02${taggableIDs.join("\x01")}`;
    }
    /**
     * @param {ConstState<number[]>} localTagServiceIDsConstState 
     * @param {ConstState<string>} taggableCursorConstState 
     * @param {ConstState<number[]>} taggableIDsConstState
     * @param {(() => void)[]} addToCleanup
     * @param {FetchCacheOptions} options
     */
    getTagsFromLocalTagServiceIDsConstState(localTagServiceIDsConstState, taggableCursorConstState, taggableIDsConstState, addToCleanup, options) {
        return this.#apiCallConstState(
            [localTagServiceIDsConstState, taggableCursorConstState, taggableIDsConstState],
            "getTagsFromLocalTagServiceIDs",
            FetchCache.#getTagsFromLocalTagServiceIDsHash,
            getTagsFromLocalTagServiceIDs,
            addToCleanup,
            {
                initialValue: [],
                ...options
            }
        );
    }
    
    /**
     * @param {ClientSearchQuery} clientSearchQuery
     * @param {WantedCursor} wantedCursor
     * @param {SearchWantedField | SearchWantedField[]} wantedFields
     * @param {number[]} localTagServiceIDs
     */
    static #searchTaggablesHash(clientSearchQuery, wantedCursor, wantedFields, localTagServiceIDs) {
        return `${JSON.stringify(clientSearchQuery)}\x02${wantedCursor}\x02${JSON.stringify(wantedFields)}\x02${localTagServiceIDs.join("\x01")}`;
    }

    /**
     * @param {ConstState<ClientSearchQuery>} clientSearchQueryConstState
     * @param {ConstState<WantedCursor>} wantedCursorConstState
     * @param {ConstState<SearchWantedField | SearchWantedField[]>} wantedFieldsConstState
     * @param {ConstState<number[]>} localTagServiceIDsConstState
     * @param {(() => void)[]} addToCleanup
     * @param {FetchCacheOptions} options
     */
    searchTaggablesConstState(clientSearchQueryConstState, wantedCursorConstState, wantedFieldsConstState, localTagServiceIDsConstState, addToCleanup, options) {
        return this.#apiCallConstState(
            [clientSearchQueryConstState, wantedCursorConstState, wantedFieldsConstState, localTagServiceIDsConstState],
            "searchTaggables",
            FetchCache.#searchTaggablesHash,
            searchTaggables,
            addToCleanup,
            {
                initialValue: {
                    cursor: undefined,
                    result: []
                },
                ...options
            }
        );
    }
    
    /**
     * @param {number[]} fileIDs
     */
    static #selectFilesHash(fileIDs) {
        return `${fileIDs.join("\x01")}`;
    }
    /**
     * @param {ConstState<number[]>} fileIDsConstState
     * @param {(() => void)[]} addToCleanup
     * @param {FetchCacheOptions} options
     */
    selectFilesConstState(fileIDsConstState, addToCleanup, options) {
        return this.#apiCallConstState(
            [fileIDsConstState],
            "selectFiles",
            FetchCache.#selectFilesHash,
            selectFiles,
            addToCleanup,
            {
                initialValue: [],
                ...options
            }
        );
    }
}