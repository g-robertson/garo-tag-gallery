
/**
 * @typedef {Object} PageType
 * @property {string} pageType
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} persistentState
 * @property {Record<string, any>} extraProperties
*/

import setUserPages from "../../api/client-get/set-user-pages.js";
import { clamp, unusedID } from "../js/client-util.js";

/**
 * @typedef {Object} StateCallbackOptions
 * @property {boolean=} requireChangeForUpdate
 */

/**
 * @template T
 * @typedef {(currentValue: T, previousValue: T) => void} StateCallback
 */

/**
 * @template T
 * @typedef {Object} StateCallbackInfo
 * @property {StateCallback<T>} callback
 * @property {StateCallbackOptions} options
 */

/**
 * @typedef {Object} StateOptions
 */

/**
 * @template T
 * @typedef {Object} StateTransformOptions
 * @property {T=} initialValue
 */

/**
 * @template T
 * @typedef {Object} StateTransformOptions
 * @property {T=} initialValue
 * @property {boolean=} waitForSet
 */

/** @template T */
export class State {
    /** @type {Set<StateCallbackInfo<T>>} */
    #callbackInfos = new Set();
    /** @type {{ref: T}} */
    #valueRef = {ref: undefined};

    /**
     * @param {T} initialValue
     * @param {StateOptions} options
     */
    constructor(initialValue, options) {
        options ??= {};
        this.#valueRef.ref = initialValue;
    }

    /**
     * @param {StateCallback<T>} callback 
     * @param {(() => void)[]} addToCleanup
     * @param {StateCallbackOptions} options 
     */
    addOnUpdateCallback(callback, addToCleanup, options) {
        options ??= {};
        if (addToCleanup === undefined) {
            throw new Error("State variable does not have a cleanup collection specified for callback, one must be specified.");
        }

        const callbackInfo = {callback, options};
        this.#callbackInfos.add(callbackInfo);
        
        const cleanupFunction = () => {
            this.#callbackInfos.delete(callbackInfo);
        };
        if (addToCleanup !== undefined) {
            addToCleanup.push(cleanupFunction);
        }
    }

    /**
     * @param {T} value 
     * @param {T} previousValue 
     */
    #onUpdate(value, previousValue) {
        for (const callbackInfo of this.#callbackInfos) {
            if (callbackInfo.options.requireChangeForUpdate === true) {
                if (previousValue !== value) {
                    callbackInfo.callback(value, previousValue);
                }
            } else {
                callbackInfo.callback(value, previousValue);
            }
        }
    }

    set(value) {
        const previousValue = this.#valueRef.ref;
        this.#valueRef.ref = value;
        this.#onUpdate(this.#valueRef.ref, previousValue);
    }

    /** @type {State<T>} */
    #movedFrom;
    /**
     * @param {State<T>} otherState 
     */
    consumeCallbacks(otherState) {
        const otherStateCallbacks = otherState.#callbackInfos;
        const otherStateValueRef = otherState.#valueRef;
        for (const callback of otherStateCallbacks) {
            this.#callbackInfos.add(callback)
        }

        // Move all moved from states to be equivalent to the current state
        this.#movedFrom = otherState
        let movedFromState = this.#movedFrom;
        while (movedFromState !== undefined) {
            movedFromState.#callbackInfos = this.#callbackInfos;
            movedFromState.#valueRef = this.#valueRef;

            movedFromState = movedFromState.#movedFrom;
        }
        
        for (const callback of otherStateCallbacks) {
            callback.callback(this.#valueRef.ref, otherStateValueRef.ref);
        }
    }

    forceUpdate() {
        this.#onUpdate(this.#valueRef.ref, this.#valueRef.ref);
    }

    get() {
        return this.#valueRef.ref;
    }

    /**
     * @returns {ConstState<T>}
     */
    asConst() {
        return new ConstState(this);
    }

    /**
     * @template T2
     * @param {(currentValue: T) => T2} transform
     * @param {(() => void)[]} addToCleanup
     * @param {StateTransformOptions<T2>=} options
     * @returns {ConstState<T2>}
     */
    asTransform(transform, addToCleanup, options) {
        options ??= {};
        const state = new State();

        this.addOnUpdateCallback(currentValue => {
            state.set(transform(currentValue))
        }, addToCleanup);
        state.set(transform(this.#valueRef.ref));

        return new ConstState(state);
    }

    /**
     * @template R1, R2, R3, R4, R5, R6, R7
     * @typedef {(
     *     transforms: [
     *         (currentValue: T) => R1,
     *         (currentValue: T) => R2,
     *         (currentValue: T) => R3,
     *         (currentValue: T) => R4, 
     *         (currentValue: T) => R5, 
     *         (currentValue: T) => R6, 
     *         (currentValue: T) => R7, 
     *     ],
     *     addToCleanup: (() => void)[],
     *     options: StateTransformOptions=
     * ) => [
     *     ConstState<R1>,
     *     ConstState<R2>,
     *     ConstState<R3>,
     *     ConstState<R4>, 
     *     ConstState<R5>, 
     *     ConstState<R6>, 
     *     ConstState<R7>, 
     * ]} AsAtomicTransformFunction
     **/

    /**
     * @template R1, R2, R3, R4, R5, R6, R7
     * @type {AsAtomicTransformFunction<R1, R2, R3, R4, R5, R6, R7>}
     **/
    asAtomicTransforms(transforms, addToCleanup, options) {
        options ??= {};
        const states = transforms.map(() => new State());

        this.addOnUpdateCallback(currentValue => {
            for (let i = 0; i < transforms.length; ++i) {
                states[i].#valueRef.ref = transforms[i](currentValue);
            }
            for (const state of states) {
                state.forceUpdate();
            }
        }, addToCleanup);
        for (let i = 0; i < transforms.length; ++i) {
            states[i].#valueRef.ref = transforms[i](this.#valueRef.ref);
        }
        for (const state of states) {
            state.forceUpdate();
        }

        return states.map(state => new ConstState(state));
    }

    /**
     * @template T
     * @param {State[]} states 
     * @param {() => T} transform 
     * @param {(() => void)[]} addToCleanup
     * @param {StateTransformOptions<T>=} options
     */
    static tupleTransform(states, transform, addToCleanup, options) {
        options ??= {};
        /** @type {State<T>} */
        const transformState = new State();

        for (const state of states) {
            state.addOnUpdateCallback(() => {
                transformState.set(transform());
            }, addToCleanup)
        }
        transformState.set(transform());

        return new ConstState(transformState);
    }

    /**
     * @template T
     * @param {State[]} states 
     * @param {() => Promise<T>} asyncTransform 
     * @param {(() => void)[]} addToCleanup
     * @param {StateAsyncTransformOptions<T>=} options
     */
    static asyncTupleTransform(states, asyncTransform, addToCleanup, options) {
        options ??= {};
        /** @type {State<T>} */
        const transformState = new State(options.initialValue);

        for (const state of states) {
            state.addOnUpdateCallback(() => {
                asyncTransform().then(result => {
                    transformState.set(result);
                });
            }, addToCleanup)
        }
        if (options.waitForSet !== true) {
            asyncTransform().then(result => {
                transformState.set(result);
            });
        }

        return new ConstState(transformState);
    }
}

/** @template T */
export class ConstState {
    /** @type {State<T>} */
    #state;

    /**
     * @param {State<T>} state 
     */
    constructor(state) {
        this.#state = state;
    }

    /**
     * @param {StateCallback<T>} callback 
     * @param {(() => void)[]} addToCleanup
     * @param {StateCallbackOptions} options 
     */
    addOnUpdateCallback(callback, addToCleanup, options) {
        this.#state.addOnUpdateCallback(callback, addToCleanup, options);
    }

    get() {
        return this.#state.get();
    }

    /**
     * @template T
     * @param {T} value 
     */
    static instance(value) {
        return new ConstState(new State(value));
    }
    
    /**
     * @template T2
     * @param {(currentValue: T) => T2} transform
     * @param {(() => void)[]} addToCleanup
     * @param {StateTransformOptions<T2>=} options
     */
    asTransform(transform, addToCleanup, options) {
        options ??= {};
        return this.#state.asTransform(transform, addToCleanup, options);
    }
    
    /**
     * @template R1, R2, R3, R4, R5, R6, R7
     * @type {AsAtomicTransformFunction<R1, R2, R3, R4, R5, R6, R7>}
     **/
    asAtomicTransforms(transforms, addToCleanup, options) {
        return this.#state.asAtomicTransforms(transforms, addToCleanup, options);
    }
}

/**
 * @typedef {Object} _PersistentStateOptions
 * @property {boolean=} isSaved
 * @property {(() => void)[]=} addToCleanup
 **/

/** @typedef {_PersistentStateOptions & StateCallbackOptions} PersistentStateOptions */

/** @typedef {Record<string, any>} PriorPersistentState */
/** @typedef {(persistentState: PersistentState) => void} PersistentStateCallback */

export class PersistentState {
    /** @type {PriorPersistentState} */
    #priorState = {};
    /** @type {PersistentStateCallback[]} */
    #callbacks = [];
    /** @type {Map<string, State | PersistentState | ConstState>} */
    #states = new Map();
    /** @type {Set<string>} */
    #savedKeys = new Set();

    /**
     * @param {} priorState
     */
    constructor(priorState) {
        this.#priorState = priorState ?? {};
    }

    clear() {
        this.#priorState = {};
        this.#states = new Map();
    }

    /**
     * @param {PriorPersistentState} priorState 
     */
    set(priorState) {
        this.#priorState = priorState;
    }

    /**
     * @param {string} key 
     */
    get(key) {
        return this.#states.get(key);
    }
    
    toJSON() {
        const jsonState = {};
        for (const [key, state] of this.#states) {
            if (state instanceof PersistentState) {
                jsonState[key] = state.toJSON();
            } else if (this.#savedKeys.has(key)) {
                jsonState[key] = state.get();
            }
        }
        
        return jsonState;
    }

    #onUpdate() {
        for (const callback of this.#callbacks) {
            callback(this);
        }
    }

    /**
     * @template {State | PersistentState | ConstState} T
     * @param {string} key 
     * @param {T} state 
     * @param {PersistentStateOptions} options
     * @returns T
     */
    registerState(key, state, options) {
        options ??= {};

        if (!(state instanceof PersistentState) && options.addToCleanup === undefined) {
            throw new Error("You must specify a cleanup function in options when registering a non-persistent State to a PersistentState")
        }

        if (state instanceof ConstState) {
            if (options.isSaved) {
                throw new Error("state cannot be ConstState and saved as ConstState cannot be written to from the saved value");
            } else {
                delete this.#priorState[key];
            }
        }
        
        if (options.isSaved === true) {
            this.#savedKeys.add(key);
        }

        this.#states.set(key, state);
        if (this.#priorState[key] !== undefined) {
            state.set(this.#priorState[key]);
            delete this.#priorState[key];
        }
        state.addOnUpdateCallback(this.#onUpdate.bind(this), options.addToCleanup, {...options, requireChangeForUpdate: true});
        return state;
    }

    /**
     * @param {PersistentStateCallback} callback 
     */
    addOnUpdateCallback(callback) {
        this.#callbacks.push(callback);
    }
}

export class Page {
    #pageType;
    #pageDisplayName;
    #pageID;
    #persistentState;
    #extraProperties;

    /**
     * @param {string} pageType 
     * @param {string} pageDisplayName 
     * @param {PersistentState=} persistentState
     * @param {Record<string, any>=} extraProperties
     * @param {string=} pageID
     */
    constructor(pageType, pageDisplayName, persistentState, extraProperties, pageID) {
        this.#pageType = pageType;
        this.#pageDisplayName = pageDisplayName;
        this.#persistentState = persistentState ?? new PersistentState();
        // no cleanup needed, page will already be destroyed if this needs cleaned up
        this.#persistentState.addOnUpdateCallback(() => {setUserPages(Pages.Global());});
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
            new PersistentState(pageJSON.persistentState),
            pageJSON.extraProperties,
            pageJSON.pageID
        );
    }

    toJSON() {
        return {
            pageType: this.#pageType,
            pageDisplayName: this.#pageDisplayName,
            persistentState: this.#persistentState.toJSON(),
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

    get persistentState() {
        return this.#persistentState;
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
     * @param {(() => void)[]} addToCleanup
     */
    addOnUpdateCallback(onUpdateCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback for pages";
        }

        this.#onUpdateCallbacks.add(onUpdateCallback);

        addToCleanup.push(() => {
            this.#onUpdateCallbacks.delete(onUpdateCallback);
        });
    }
    
    #onCurrentPageChanged() {
        for (const onCurrentPageChangedCallback of this.#onCurrentPageChangedCallbacks) {
            onCurrentPageChangedCallback();
        }
    }

    /**
     * @param {() => void} onCurrentPageChangedCallback
     * @param {(() => void)[]} addToCleanup
     */
    addOnCurrentPageChangedCallback(onCurrentPageChangedCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback for pages";
        }

        this.#onCurrentPageChangedCallbacks.add(onCurrentPageChangedCallback);

        addToCleanup.push(() => {
            this.#onCurrentPageChangedCallbacks.delete(onCurrentPageChangedCallback);
        });
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
    
    /**
     * @param {Page} page 
     */
    removePage(page) {
        const pageIndex = this.#pages.findIndex(pagesPage => pagesPage === page);
        this.removePageAt(pageIndex);
    }
};