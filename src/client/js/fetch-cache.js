import { RealizationMap } from "./client-util.js";

const TAG_ENDPOINTS = Object.freeze({
    "tags-from-local-tag-services": 0,
    "search-taggables": 0,
});

const FILE_ENDPOINTS = Object.freeze({
    "select-file-comparisons": 0,
    "select-files": 0
});

export class FetchCache {
    /** @type {Map<keyof TAG_ENDPOINTS | keyof FILE_ENDPOINTS, RealizationMap<string, any>>} */
    #cache;
    rerender = () => {};

    /**
     * @param {FetchCache} fetchCache 
     */
    constructor(fetchCache) {
        this.#generateCache(fetchCache);
    }

    static #Gl_FetchCache = new FetchCache();

    static Global() {
        return FetchCache.#Gl_FetchCache;
    }

    /**
     * @param {FetchCache} fetchCache 
     */
    #generateCache(fetchCache) {
        this.#cache = new Map();

        let getNewRealizationMap = (endpoint) => {
            return fetchCache.cache(endpoint);
        }
        if (fetchCache === undefined) {
            getNewRealizationMap = () => new RealizationMap();
        }

        for (const endpoint of [...Object.keys(TAG_ENDPOINTS), ...Object.keys(FILE_ENDPOINTS)]) {
            if (!this.#cache.has(endpoint)) {
                this.#cache.set(endpoint, getNewRealizationMap(endpoint));
            }
        }
    }

    regenerateTagsCache() {
        for (const endpoint of [...Object.keys(TAG_ENDPOINTS), ...Object.keys(FILE_ENDPOINTS)]) {
            this.#cache.delete(endpoint);
        }
        this.#generateCache();
        this.rerender();
    }

    /**
     * @param {keyof ENDPOINTS} cache 
     */
    cache(cache) {
        return this.#cache.get(cache);
    }
}