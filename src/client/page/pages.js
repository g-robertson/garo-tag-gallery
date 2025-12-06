
/**
 * @typedef {Object} PageType
 * @property {string} pageType
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} existingState
 * @property {Record<string, any>} extraProperties
*/

import setUserPages from "../../api/client-get/set-user-pages.js";
import { clamp, mapNullCoalesce, unusedID } from "../js/client-util.js";

/**
 * @template T
 * @typedef {Object} AddOnUpdateCallbackOptions
 * @property {boolean=} requireChangeForUpdate Value must change between previous onUpdate call to execute onUpdate
 * @property {symbol=} produces In a set of callbacks with consumers of {symbol}, the producers of {symbol} must run first
 * @property {Set<symbol>=} consumes In a set of callbacks with consumers of {symbol}, the producers of {symbol} must run first
 * 
 */
/**
 * @template T
 * @typedef {(val: T, prevVal: T) => Promise<void>} OnUpdateCallback
 */

/**
 * @template T
 * @typedef {{
 *     callback: OnUpdateCallback<T>
 *     produces?: symbol
 *     consumes: Set<symbol>
 * }} OnUpdateCallbackInfo
 */

/**
 * @template T
 * @typedef {Object} ExistingStateRef
 * @property {<TransformV>(transform: (val: T) => TransformV) => ExistingStateConstRef<TransformV>} getTransformRef
 * @property {(val: T) => void} update
 * @property {() => void} forceUpdate
 * @property {(onUpdateCallback: OnUpdateCallback<T>, cleanupFunction: () => void, options?: AddOnUpdateCallbackOptions<T>) => (() => void)} addOnUpdateCallback
 * @property {() => T} get
 */

/**
 * @template T
 * @typedef {Object} ExistingStateConstRef
 * @property {<TransformV>(transform: (val: T) => TransformV) => ExistingStateConstRef<TransformV>} getTransformRef
 * @property {(onUpdateCallback: OnUpdateCallback<T>, cleanupFunction: () => void, options?: AddOnUpdateCallbackOptions<T>) => (() => void)} addOnUpdateCallback
 * @property {() => T} get
 */

/**
 * @template T
 * @typedef {Object} ExistingStateAsyncConstRef
 * @property {(cleanupFunction: () => void) => (() => void)} assignCleanup
 * @property {<TransformV>(transform: (val: T) => Promise<TransformV>) => ExistingStateAsyncConstRef<TransformV>} getAsyncTransformRef
 * @property {(onUpdateCallback: OnUpdateCallback<T>, cleanupFunction: () => void, options?: AddOnUpdateCallbackOptions<T>) => (() => void)} addOnUpdateCallback
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
    /** @type {Map<K, Set<OnUpdateCallbackInfo<T[K]>} */
    #onUpdateCallbacksForKeys = new Map();
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
            }
            this.forceUpdate(key);
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
     * @param {() => void} cleanupFunction
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
     * @param {OnUpdateCallback<T[K]>} onUpdateCallback
     * @param {() => void} cleanupFunction
     * @param {AddOnUpdateCallbackOptions<T>} options
     * @param {T[K]} val
     * @param {T[K]} prevVal
     */
    static async #executeOnUpdateCallback(onUpdateCallback, options, val, prevVal) {
        options ??= {};
        const requireChangeForUpdate = options.requireChangeForUpdate ?? false;
        if (!requireChangeForUpdate) {
            await onUpdateCallback(val, prevVal);
        } else if (val !== prevVal) {
            await onUpdateCallback(val, prevVal);
        }
    }

    /**
     * @template {keyof T} K
     * @param {K} key
     * @param {OnUpdateCallback<T[K]>} onUpdateCallback
     * @param {() => void} cleanupFunction
     * @param {AddOnUpdateCallbackOptions<T>} options
     */
    addOnUpdateCallbackForKey(key, onUpdateCallback, cleanupFunction, options) {
        if (cleanupFunction === undefined) {
            throw "You must specify a cleanup function or null for adding a callback for an existing state key";
        }
        cleanupFunction ??= () => {};
        options ??= {};
        options.consumes ??= new Set();

        const originalOnUpdateCallback = onUpdateCallback;
        onUpdateCallback = {
            callback: async (val, prevVal) => { await ExistingState.#executeOnUpdateCallback(originalOnUpdateCallback, options, val, prevVal); },
            produces: options.produces,
            consumes: options.consumes
        };

        mapNullCoalesce(this.#onUpdateCallbacksForKeys, key, new Set()).add(onUpdateCallback);

        return () => {
            cleanupFunction();
            this.callbackSelf().#onUpdateCallbacksForKeys.get(key).delete(onUpdateCallback);
        }
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
    async #onUpdateKey(key, prevValue) {
        // Order tree so that consumer always comes after producer
        const callbackTree = [...(this.#onUpdateCallbacksForKeys.get(key) ?? [])].sort((a, b) => {
            if (a.consumes.has(b.produces)) {
                return 1;
            } else if (b.consumes.has(a.produces)) {
                return -1;
            } else {
                return 0;
            }
        })
        for (const onUpdateCallback of callbackTree) {
            if (onUpdateCallback.produces) {
                await onUpdateCallback.callback(this.#state[key], prevValue);
            } else {
                onUpdateCallback.callback(this.#state[key], prevValue);
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
                let prevVal = transform(self.callbackSelf().#state[key]);
                return self.callbackSelf().addOnUpdateCallbackForKey(key, async (val) => {
                    const transformVal = transform(val);
                    await ExistingState.#executeOnUpdateCallback(onUpdateCallback, options, transformVal, prevVal);
                    prevVal = transformVal;
                }, cleanupFunction, options);
            },
            get() { return transform(self.callbackSelf().#state[key]); }
        }
    }

    /**
     * @template TransformV
     * @param {ExistingStateConstRef<unknown>[]} constRefs 
     * @param {() => TransformV} transform
     * @return {ExistingStateConstRef<TransformV>}
     */
    static tupleTransformRef(constRefs, transform) {
        return {
            getTransformRef: (transform2) => {
                return ExistingState.tupleTransformRef(constRefs, () => transform2(transform()))
            },
            addOnUpdateCallback: (onUpdateCallback, cleanupFunction, options) => {
                let prevVal = transform();
                for (const constRef of constRefs) {
                    cleanupFunction = constRef.addOnUpdateCallback(async () => {
                        const transformVal = transform();
                        await ExistingState.#executeOnUpdateCallback(onUpdateCallback, options, transformVal, prevVal);
                        prevVal = transformVal;
                    }, cleanupFunction, options);
                }
                return cleanupFunction;
            },
            get() { return transform(); }
        }
    }

    /** @type {Map<symbol, {cleanupAssigned: boolean, value: any, updating: Promise}>} */
    static #transformState = new Map();

    /**
     * @template TransformV
     * @param {ExistingStateAsyncConstRef<unknown>[]} constRefs 
     * @param {() => Promise<TransformV>} transform
     * @param {TransformV>} initialValue
     * @param {{
     *     waitForSet?: boolean
     * }} options
     * @return {ExistingStateAsyncConstRef<TransformV>}
     */
    static asyncTupleTransformRef(constRefs, transform, initialValue, options) {
        options ??= {};
        options.waitForSet ??= false;

        const transformID = Symbol();
        ExistingState.#transformState.set(transformID, {
            cleanupAssigned: false,
            value: initialValue,
            updating: undefined
        });
        const onUpdateCallbacks = [];

        const globalCleanupFunctions = [];
        for (const constRef of constRefs) {
            globalCleanupFunctions.push(constRef.addOnUpdateCallback(async () => {
                ExistingState.#transformState.get(transformID).value = await transform();
            }, null, {produces: transformID}));
        }
        
        globalCleanupFunctions.push(() => {
            ExistingState.#transformState.delete(transformID);
        });
        const globalCleanup = () => {
            for (const globalCleanupFunction of globalCleanupFunctions) {
                globalCleanupFunction();
            }
        };

        /** @type {ExistingStateAsyncConstRef<TransformV>} */
        const ref = {
            assignCleanup: (cleanupFunction) => {
                ExistingState.#transformState.get(transformID).cleanupAssigned = true;
                return () => {
                    globalCleanup();
                    cleanupFunction();
                };
            },
            getAsyncTransformRef: (transform2) => {
                const asyncTransformRef = ExistingState.asyncTupleTransformRef(constRefs, async () => {
                    return await transform2(await transform());
                });
                let childCleanup = () => {};
                childCleanup = asyncTransformRef.assignCleanup(childCleanup);
                globalCleanupFunctions.push(childCleanup);
                return asyncTransformRef;
            },
            addOnUpdateCallback: (onUpdateCallback, cleanupFunction, options) => {
                if (!ExistingState.#transformState.get(transformID).cleanupAssigned) {
                    throw "Cleanup was not assigned for async tuple transform ref before using addOnUpdateCallback()";
                }
                let prevVal = ExistingState.#transformState.get(transformID).value;
                for (const constRef of constRefs) {
                    const realCB = async () => {
                        const transformVal = ExistingState.#transformState.get(transformID).value;
                        ExistingState.#executeOnUpdateCallback(onUpdateCallback, options, transformVal, prevVal);
                        prevVal = transformVal;
                    };

                    cleanupFunction = constRef.addOnUpdateCallback(realCB, cleanupFunction, {...options, consumes: new Set([transformID])});
                    onUpdateCallbacks.push(realCB);
                }
                return cleanupFunction;
            },
            get: () => {
                if (!ExistingState.#transformState.get(transformID).cleanupAssigned) {
                    throw "Cleanup was not assigned for async tuple transform ref before using get()";
                }
                return ExistingState.#transformState.get(transformID).value;
            }
        };

        if (!options.waitForSet) {
            transform().then(value => {
                ExistingState.#transformState.get(transformID).value = value;
                for (const callback of onUpdateCallbacks) {
                    callback();
                }
            });
        }

        return ref;
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
        this.#pageID = pageID ?? unusedID();
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
     * @param {() => void} cleanupFunction
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
     * @param {() => void} cleanupFunction
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