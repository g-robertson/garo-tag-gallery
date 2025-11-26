
/**
 * @typedef {Object} PageType
 * @property {string} pageType
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} existingState
 * @property {Record<string, any>} extraProperties
*/

import setUserPages from "../../api/client-get/set-user-pages.js";
import { clamp, mapNullCoalesce, randomID } from "../js/client-util.js";

/**
 * @template T
 * @typedef {Object} AddOnUpdateCallbackOptions
 * @property {boolean} requireChangeForUpdate
 * @property {<MappedT>(val: T) => MappedT} valueMappingFunction
 * @property {<MappedT>(val: T) => MappedT} prevValueMappingFunction
 */

/**
 * @template T
 * @typedef {(val: T, prevVal: T) => void} OnUpdateCallback
 */

/**
 * @template T
 * @typedef {Object} ExistingStateRef
 * @property {<TransformV>(transform: (val: T) => TransformV) => ExistingStateConstRef<TransformV>} getTransformRef
 * @property {(val: T) => void} update
 * @property {() => void} forceUpdate
 * @property {(onUpdateCallback: OnUpdateCallback<T>, cleanupFunction: (() => void) | null, options?: AddOnUpdateCallbackOptions<T>) => (() => void)} addOnUpdateCallback
 * @property {() => T} get
 */

/**
 * @template T
 * @typedef {Object} ExistingStateConstRef
 * @property {<TransformV>(transform: (val: T) => TransformV) => ExistingStateConstRef<TransformV>} getTransformRef
 * @property {(onUpdateCallback: OnUpdateCallback<T>, cleanupFunction: (() => void) | null, options?: AddOnUpdateCallbackOptions<T>) => (() => void)} addOnUpdateCallback
 * @property {() => T} get
 */

/** @template {any} [T=Record<string, any>] */
export class ExistingState {
    /** @type {T} */
    #state = {};
    /** @type {Set<keyof T>} */
    #savedKeys = new Set();
    /** @type {Map<string, ExistingState>} */
    #innerStates = new Map();
    /** @type {Set<() => void>} */
    #onUpdateCallbacks = new Set();
    /** @template {keyof T} K */
    /** @type {Map<K, Set<OnUpdateCallback<T[K]>>} */
    #onUpdateCallbacksForKeys = new Map();
    /** @type {Map<string, string[]>} */
    #updateGroups = new Map();
    /** @template {keyof T} K */
    /** @type {Map<string, Set<{key: K, callback: OnUpdateCallback<T[K]>}>>} */
    #onUpdateGroupCallbacksForKeys = new Map();
    // Updates to be always equal to whatever [this] is calling the callbacks, useful for when callbacks are consumed by another ExistingState
    #callbackSelf = () => { return this; };
    /**
     * @param {T=} state
     * @param {{
     *   fromSaved?: boolean
     * }} options
     */
    constructor(state, options) {
        options ??= {};
        this.#state = state ?? {};
        for (const key in this.#state) {
            this.#savedKeys.add(key);
        }
    }

    callbackSelf() {
        return this.#callbackSelf();
    }

    /**
     * @param {ExistingState} existingState 
     */
    consumeCallbacks(existingState) {
        const self = this;
        // Set old existing state to propogate to next object's self
        existingState.#callbackSelf = () => { return self.callbackSelf(); }
        for (const callback of existingState.#onUpdateCallbacks) {
            this.#onUpdateCallbacks.add(callback);
            callback();
        }
        for (const [key, callbacks] of existingState.#onUpdateCallbacksForKeys) {
            const callbacksForKeys = mapNullCoalesce(this.#onUpdateCallbacksForKeys, key, new Set());
            for (const callback of callbacks) {
                callbacksForKeys.add(callback);
                callback(this.get(key));
            }
        }
        for (const [updateGroup, callbacks] of existingState.#onUpdateGroupCallbacksForKeys) {
            const callbacksForUpdateGroup = mapNullCoalesce(this.#onUpdateGroupCallbacksForKeys, updateGroup, new Set());
            for (const {key, callback} of callbacks) {
                callbacksForUpdateGroup.add({key, callback});
                callback(this.get(key));
            }
        }
    }

    toJSON() {
        const jsonState = {};
        for (const key in this.#state) {
            if (this.#savedKeys.has(key)) {
                const innerState = this.#innerStates.get(key);
                if (innerState !== undefined) {
                    jsonState[key] = innerState.toJSON();
                } else {
                    jsonState[key] = this.#state[key];
                }
            }
        }
        return jsonState;
    }

    /**
     * @param {() => void} onUpdateCallback 
     * @param {(() => void) | null} cleanupFunction
     */
    addOnUpdateCallback(onUpdateCallback, cleanupFunction) {
        if (cleanupFunction === undefined) {
            throw "You must specify a cleanup function or null for adding a callback for an existing state";
        }
        cleanupFunction ??= () => {};
        this.#onUpdateCallbacks.add(onUpdateCallback);

        return () => {
            cleanupFunction();
            this.#onUpdateCallbacks.delete(onUpdateCallback);
        }
    }

    static #callbackCount = 0;
    static #callbacksRan = 0;

    /**
     * @template {keyof T} K
     * @param {K} key
     * @param {OnUpdateCallback<T[K]>} onUpdateCallback
     * @param {(() => void) | null} cleanupFunction
     * @param {{
     *   updateGroup: string,
     *   additionalCallbackOnUpdateGroup: string
     * } & AddOnUpdateCallbackOptions<T>} options
     */
    addOnUpdateCallbackForKey(key, onUpdateCallback, cleanupFunction, options) {
        if (cleanupFunction === undefined) {
            throw "You must specify a cleanup function or null for adding a callback for an existing state key";
        }
        cleanupFunction ??= () => {};
        options ??= {};

        const valueMappingFunction = options.valueMappingFunction ?? ((val) => val);
        const prevValueMappingFunction = options.prevValueMappingFunction ?? valueMappingFunction;
        const requireChangeForUpdate = options.requireChangeForUpdate ?? false;

        const originalOnUpdateCallback = onUpdateCallback;
        onUpdateCallback = (val, prevVal) => {
            // Grab prevValue first in case valueMappingFunction mutates prevValue
            const prevValMap = prevValueMappingFunction(prevVal);
            const valMap = valueMappingFunction(val);

            ++ExistingState.#callbackCount;

            if (!requireChangeForUpdate) {
                ++ExistingState.#callbacksRan;
                originalOnUpdateCallback(valMap, prevValMap);
            } else if (valMap !== prevValMap) {
                ++ExistingState.#callbacksRan;
                originalOnUpdateCallback(valMap, prevValMap);
            }
        }
        
        mapNullCoalesce(this.#onUpdateCallbacksForKeys, key, new Set()).add(onUpdateCallback);
        if (options.updateGroup !== undefined) {
            mapNullCoalesce(this.#updateGroups, key, []).push(options.updateGroup);
        }

        const onUpdateGroupCallback = {
            key,
            callback: onUpdateCallback
        };
        if (options.additionalCallbackOnUpdateGroup !== undefined) {
            mapNullCoalesce(this.#onUpdateGroupCallbacksForKeys, options.additionalCallbackOnUpdateGroup, new Set()).add(onUpdateGroupCallback);
        }

        return () => {
            cleanupFunction();
            this.callbackSelf().#onUpdateCallbacksForKeys.get(key).delete(onUpdateCallback);
            if (options.additionalCallbackOnUpdateGroup !== undefined) {
                this.callbackSelf().#onUpdateGroupCallbacksForKeys.get(options.additionalCallbackOnUpdateGroup).delete(onUpdateGroupCallback);
            }
        };
    }

    get callbackCount() {
        let count = this.#onUpdateCallbacks.length;
        for (const key in this.#onUpdateCallbacksForKeys) {
            count += this.#onUpdateCallbacksForKeys[key].length;
        }

        return count;
    }

    #onUpdate() {
        for (const onUpdateCallback of this.#onUpdateCallbacks) {
            onUpdateCallback();
        }
    }

    /**
     * @template {keyof T} K
     * @param {K} key
     * @param {T[K]} prevValue
     */
    #onUpdateKey(key, prevValue) {
        for (const onUpdateCallback of this.#onUpdateCallbacksForKeys.get(key) ?? []) {
            onUpdateCallback(this.#state[key], prevValue);
        }
        for (const updateGroup of this.#updateGroups.get(key) ?? []) {
            for (const onUpdateGroupCallback of this.#onUpdateGroupCallbacksForKeys.get(updateGroup) ?? []) {
                onUpdateGroupCallback.callback(this.#state[onUpdateGroupCallback.key], this.#state[onUpdateGroupCallback.key]);
            }
        }
    }

    /**
     * @template {keyof T} K
     * @param {K} key
     */
    get(key) {
        return this.#state[key];
    }

    /**
     * @template V
     * @param {V} val
     */
    static stateRef(val) {
        /** @type {ExistingState<{ref: V}} */
        const state = new ExistingState();
        state.update("ref", val);
        return state.getRef("ref");
    }

    static constStateRef(val) {
        /** @type {ExistingState<{ref: V}} */
        const state = new ExistingState();
        state.update("ref", val);
        return state.getConstRef("ref");
    }

    /**
     * @description Returns a permanently alive reference to the key along with means to callback when it is updated
     * @template {keyof T} K
     * @param {K} key 
     * @returns {ExistingStateRef<T[K]>}
     */
    getRef(key) {
        const self = this;
        return {
            getTransformRef: (transform) => {
                return self.callbackSelf().getTransformRef(key, transform);
            },
            addOnUpdateCallback: (onUpdateCallback, cleanupFunction, options) => {
                return self.callbackSelf().addOnUpdateCallbackForKey(key, onUpdateCallback, cleanupFunction, options);
            },
            update: (val) => { self.update(key, val); },
            forceUpdate() { self.callbackSelf().forceUpdate(key); },
            get() {return self.callbackSelf().get(key); },
        }
    }

    /**
     * @description Returns a permanently alive reference to the key along with means to callback when it is updated
     * @template {keyof T} K
     * @param {K} key 
     * @returns {ExistingStateConstRef<T[K]>}
     */
    getConstRef(key) {
        const self = this;
        return {
            getTransformRef: (transform) => {
                return self.callbackSelf().getTransformRef(key, transform);
            },
            addOnUpdateCallback: (onUpdateCallback, cleanupFunction, options) => {
                return self.callbackSelf().addOnUpdateCallbackForKey(key, onUpdateCallback, cleanupFunction, options);
            },
            get() {return self.callbackSelf().get(key); }
        }
    }

    /**
     * @description Returns a permanently alive reference to the key along with means to callback when it is updated, that is transformed by transform function when retrieved
     * @template {keyof T} K
     * @template TransformV
     * @param {K} key 
     * @param {(value: T[K]) => TransformV} transform
     * @returns {ExistingStateConstRef<TransformV>}
     */
    getTransformRef(key, transform) {
        const self = this;
        return {
            getTransformRef: (transform2) => {
                return self.callbackSelf().getTransformRef(key, (val) => transform2(transform(val)));
            },
            addOnUpdateCallback: (onUpdateCallback, cleanupFunction, options) => {
                let valueMappingFunction = transform;
                if (options?.valueMappingFunction) {
                    valueMappingFunction = (val) => options.valueMappingFunction(transform(val));
                }

                let prevVal_ = valueMappingFunction(self.callbackSelf().#state[key]);
                return self.callbackSelf().addOnUpdateCallbackForKey(key, (val, prevValue) => {
                    onUpdateCallback(val, prevValue);
                    prevVal_ = val;   
                }, cleanupFunction, {
                    valueMappingFunction,
                    prevValueMappingFunction: () => prevVal_,
                    ...options
                });
            },
            get() {return transform(self.callbackSelf().get(key)); }
        }
    }

    /**
     * @param {ExistingStateConstRef<unknown>[]} constRefs 
     * @param {() => TransformV} transform
     * @return {ExistingStateConstRef<undefined>}
     */
    static tupleTransformRef(constRefs, transform) {
        return {
            getTransformRef: (transform2) => {
                return ExistingState.tupleTransformRef(constRefs, () => transform2(transform()))
            },
            addOnUpdateCallback: (onUpdateCallback, cleanupFunction, options) => {
                let valueMappingFunction = transform;
                if (options?.valueMappingFunction) {
                    valueMappingFunction = () => options.valueMappingFunction(transform());
                }

                let prevVal_ = valueMappingFunction();
                for (const constRef of constRefs) {
                    cleanupFunction = constRef.addOnUpdateCallback((val, prevVal) => {
                        onUpdateCallback(val, prevVal);
                        prevVal_ = val;
                    }, cleanupFunction, {
                        valueMappingFunction,
                        prevValueMappingFunction: () => prevVal_,
                        ...options
                    });
                }
                return cleanupFunction;
            },
            get() {return transform(); }
        }
    }

    clear() {
        const oldState = this.#state;
        this.#state = {};
        this.#innerStates = new Map();
        for (const key in this.#onUpdateCallbacksForKeys) {
            this.#onUpdateKey(key, oldState[key]);
        }
        this.#onUpdate();
    }

    /**
     * @template {keyof T} K
     * @param {K} key 
     * @param {T[K]} value
     * @param {{
     *   isSaved?: boolean
     * }} options
     */
    initAssign(key, value, options) {
        options ??= {};

        this.#state[key] ??= value;
        if (options.isSaved === true) {
            this.#savedKeys.add(key);
        }
    }

    /**
     * @template {keyof T} K
     * @param {K} key 
     * @param {T[K]} value 
     */
    update(key, value) {
        const prevValue = this.#state[key];
        this.#state[key] = value;
        this.#onUpdateKey(key, prevValue);
        this.#onUpdate();
    }
    
    /**
     * @template {keyof T} K
     * @param {K} key 
     */
    forceUpdate(key) {
        this.#onUpdateKey(key, this.#state[key]);
        this.#onUpdate();
    }

    /**
     * @template {keyof T} K
     * @param {K} key 
     */
    getInnerState(key) {
        let innerState = this.#innerStates.get(key);
        if (innerState !== undefined) {
            return innerState;
        }

        this.#savedKeys.add(key);
        this.#state[key] ??= {};
        innerState = new ExistingState(this.#state[key]);
        // No cleanup necessary, if this needs cleaned up then the inner state is gone and unreferenceable
        innerState.addOnUpdateCallback(() => {
            this.update(key, innerState.#state);
        }, null);
        this.#innerStates.set(key, innerState);

        return innerState;
    }
}

export class Page {
    #pageType;
    #pageDisplayName;
    #pageID;
    #existingState;
    #extraProperties;

    /**
     * @param {string} pageType 
     * @param {string} pageDisplayName 
     * @param {ExistingState=} existingState
     * @param {Record<string, any>=} extraProperties
     * @param {string=} pageID
     */
    constructor(pageType, pageDisplayName, existingState, extraProperties, pageID) {
        this.#pageType = pageType;
        this.#pageDisplayName = pageDisplayName;
        this.#existingState = existingState ?? new ExistingState();
        // no cleanup needed, page will already be destroyed if this needs cleaned up
        this.#existingState.addOnUpdateCallback(() => {setUserPages(Pages.Global());}, null);
        this.#extraProperties = extraProperties ?? {};
        this.#pageID = pageID ?? randomID(32);
    }

    /**
     * @param {PageType} pageJSON
     */
    static fromJSON(pageJSON) {
        return new Page(
            pageJSON.pageType,
            pageJSON.pageDisplayName,
            new ExistingState(pageJSON.existingState),
            pageJSON.extraProperties,
            pageJSON.pageID
        );
    }

    toJSON() {
        return {
            pageType: this.#pageType,
            pageDisplayName: this.#pageDisplayName,
            existingState: this.#existingState.toJSON(),
            extraProperties: this.#extraProperties,
            pageID: this.#pageID
        };
    }

    get pageType() {
        return this.#pageType;
    }

    get pageDisplayName() {
        return this.#pageDisplayName;
    }

    get pageID() {
        return this.#pageID;
    }

    get existingState() {
        return this.#existingState;
    }

    get extraProperties() {
        return this.#extraProperties;
    }
}

export class Pages {
    /** @type {Page[]} */
    #pages = [];
    /** @type {Page} */
    #currentPage = undefined;
    /** @type {Set<() => void>} */
    #onUpdateCallbacks = new Set();
    /** @type {Set<() => void>} */
    #onCurrentPageChangedCallbacks = new Set();

    /**
     * @param {Page[]=} pages 
     */
    constructor(pages) {
        pages ??= [];
        this.#pages = pages;
    }

    toJSON() {
        return this.#pages.map(page => page.toJSON());
    }

    static #Gl_Pages = new Pages();

    static Global() {
        return Pages.#Gl_Pages;
    }

    /**
     * @param {Pages} newPages 
     */
    static makeGlobal(newPages) {
        newPages.#onUpdateCallbacks = Pages.#Gl_Pages.#onUpdateCallbacks;
        newPages.#onCurrentPageChangedCallbacks = Pages.#Gl_Pages.#onCurrentPageChangedCallbacks;
        Pages.#Gl_Pages.#onUpdateCallbacks = new Set();
        Pages.#Gl_Pages.#onCurrentPageChangedCallbacks = new Set();
        Pages.#Gl_Pages = newPages;
        Pages.#Gl_Pages.#onUpdate();
        Pages.#Gl_Pages.#onCurrentPageChanged();
    }

    get pages() {
        return this.#pages;
    }
    get currentPage() {
        return this.#currentPage;
    }

    #onUpdate() {
        for (const onUpdateCallback of this.#onUpdateCallbacks) {
            onUpdateCallback();
        }
    }

    /**
     * @param {() => void} onUpdateCallback
     * @param {(() => void) | null} cleanupFunction
     */
    addOnUpdateCallback(onUpdateCallback, cleanupFunction) {
        if (cleanupFunction === undefined) {
            throw "You must specify a cleanup function or null for adding a callback for pages";
        }
        cleanupFunction ??= () => {};

        this.#onUpdateCallbacks.add(onUpdateCallback);

        return () => {
            cleanupFunction();
            this.#onUpdateCallbacks.delete(onUpdateCallback);
        }
    }
    
    #onCurrentPageChanged() {
        for (const onCurrentPageChangedCallback of this.#onCurrentPageChangedCallbacks) {
            onCurrentPageChangedCallback();
        }
    }

    /**
     * @param {() => void} onCurrentPageChangedCallback
     * @param {(() => void) | null} cleanupFunction
     */
    addOnCurrentPageChangedCallback(onCurrentPageChangedCallback, cleanupFunction) {
        if (cleanupFunction === undefined) {
            throw "You must specify a cleanup function or null for adding a callback for pages";
        }
        cleanupFunction ??= () => {};

        this.#onCurrentPageChangedCallbacks.add(onCurrentPageChangedCallback);

        return () => {
            cleanupFunction();
            this.#onCurrentPageChangedCallbacks.delete(onCurrentPageChangedCallback);
        }
    }

    /**
     * @param {Page[]} pages 
     */
    setPages(pages) {
        this.#pages = pages;
        this.#onUpdate();
    }

    /**
     * @param {Page} page 
     */
    addPage(page) {
        this.#pages.push(page);
        this.#currentPage = page;
        this.#onUpdate();
        this.#onCurrentPageChanged();
    }

    /**
     * @param {Page} page
     */
    setCurrentPage(page) {
        if (this.#currentPage === page) {
            return;
        }

        this.#currentPage = page;
        this.#onUpdate();
        this.#onCurrentPageChanged();
    }

    /**
     * @param {number} index
     */
    removePageAt(index) {
        const removedPage = this.#pages[index];
        this.#pages.splice(index, 1);
        if (removedPage === this.#currentPage) {
            let newIndex = clamp(index - 1, 0, Infinity);
            this.#currentPage = this.#pages[newIndex];
            this.#onCurrentPageChanged();
        }
        this.#onUpdate();
    }
};