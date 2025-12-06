import { searchTaggables } from "../../api/client-get/search-taggables.js";
import selectFiles from "../../api/client-get/select-files.js";
import getTagsFromLocalTagServiceIDs from "../../api/client-get/tags-from-local-tag-services.js";
import { ExistingState } from "../page/pages.js";
import { RealizationMap } from "./client-util.js";

/** @typedef {"tags" | "taggables" | "files"} ResettableCacheType */
/**
 * @typedef {Object} FetchCacheOptions
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

/** @import {ExistingStateRef, ExistingStateConstRef, ExistingStateAsyncConstRef} from "../page/pages.js" */

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
            state: ExistingState.stateRef()
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
     * @param {ExistingStateConstRef<any>[]} constRefs 
     * @param {Endpoint} cacheName 
     * @param {HashMethod} hasher 
     * @param {ApiMethod} apiMethod
     * @param {any} initialValue
     * @param {FetchCacheOptions} options
     * @returns {ExistingStateAsyncConstRef<Awaited<ReturnType<ApiMethod>>>}
     */
    #apiCallAsyncConstRef(constRefs, cacheName, hasher, apiMethod, initialValue, options) {
        const cache = this.#cache.get(cacheName);
        return ExistingState.asyncTupleTransformRef([
            ...constRefs,
            cache.state
        ], async () => {
            const values = constRefs.map(ref => ref.get());
            const hash = hasher(...values);
            if (cache.values.getStatus(hash) === "empty") {
                cache.values.setAwaiting(hash);
                cache.values.set(hash, await apiMethod(...values));
            }
            const returned = await cache.values.get(hash);
            console.log("awaited return", returned);
            return returned;
        }, initialValue, options)
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
     * @param {ExistingStateConstRef<number[]>} localTagServiceIDsConstRef 
     * @param {ExistingStateConstRef<string>} taggableCursorConstRef 
     * @param {ExistingStateConstRef<number[]>} taggableIDsConstRef
     * @param {FetchCacheOptions} options
     */
    getTagsFromLocalTagServiceIDsAsyncConstRef(localTagServiceIDsConstRef, taggableCursorConstRef, taggableIDsConstRef, options) {
        return this.#apiCallAsyncConstRef(
            [localTagServiceIDsConstRef, taggableCursorConstRef, taggableIDsConstRef],
            "getTagsFromLocalTagServiceIDs",
            FetchCache.#getTagsFromLocalTagServiceIDsHash,
            getTagsFromLocalTagServiceIDs,
            [],
            options
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
     * @param {ExistingStateConstRef<ClientSearchQuery>} clientSearchQuery
     * @param {ExistingStateConstRef<WantedCursor>} wantedCursor
     * @param {ExistingStateConstRef<SearchWantedField | SearchWantedField[]>} wantedFields
     * @param {ExistingStateConstRef<number[]>} localTagServiceIDs
     * @param {FetchCacheOptions} options
     */
    searchTaggablesAsyncConstRef(clientSearchQueryConstRef, wantedCursorConstRef, wantedFieldsConstRef, localTagServiceIDsConstRef, options) {
        return this.#apiCallAsyncConstRef(
            [clientSearchQueryConstRef, wantedCursorConstRef, wantedFieldsConstRef, localTagServiceIDsConstRef],
            "searchTaggables",
            FetchCache.#searchTaggablesHash,
            searchTaggables,
            {
                cursor: undefined,
                result: []
            },
            options
        );
    }
    
    /**
     * @param {number[]} fileIDs
     */
    static #selectFilesHash(fileIDs) {
        return `${fileIDs.join("\x01")}`;
    }
    /**
     * @param {ExistingStateConstRef<number[]>} fileIDsConstRef
     * @param {FetchCacheOptions} options
     */
    selectFilesAsyncConstRef(fileIDsConstRef) {
        return this.#apiCallAsyncConstRef(
            [fileIDsConstRef],
            "selectFiles",
            FetchCache.#selectFilesHash,
            selectFiles,
            [],
            options
        );
    }
}