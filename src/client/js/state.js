/** @typedef {"invalidValueSubstitute" | "previousValidSubstitute" | "validOnly" | "no-update" | () => void} InvalidSubstitute */

/**
 * @typedef {Object} StateCallbackOptions
 * @property {boolean=} requireChangeForUpdate
 * @property {InvalidSubstitute=} whenInvalidSubstitute
 * @property {string=} name
 */

/**
 * @template T
 * @typedef {Object} StateValueOptions
 * @property {T} validOnly
 * @property {T} invalidValueSubstitute
 * @property {T} previousValidSubstitute
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
 * @property {InvalidSubstitute=} whenInvalidSubstitute
 * @property {string=} name
 */

/**
 * @template T
 * @typedef {Object} StateOptions
 * @property {(State | ConstState)[]=} validityDependents
 * @property {(() => void)[]} addToCleanup
 * @property {T=} invalidValue
 * @property {string=} name
 */

/**
 * @template T
 * @typedef {Object} StateTransformOptions
 * @property {T=} initialValue
 * @property {T=} invalidValue
 * @property {InvalidSubstitute=} whenInvalidSubstitute
 * @property {string=} name
 */

/**
 * @template T
 * @typedef {Object} StateAsyncTransformOptions
 * @property {T=} initialValue
 * @property {State[]=} invalidatesOn
 * @property {T=} invalidValue
 * @property {boolean=} updateOnCreate
 * @property {InvalidSubstitute=} whenInvalidSubstitute
 * @property {string=} name
 */

/** @template T */
export class State {
    #stateRef = {
        name: undefined,
        /** @type {T} */
        value: undefined,
        /** @type {T} */
        previousValidValue: undefined,
        /** @type {T} */
        invalidValue: undefined,
        /** @type {Set<StateCallbackInfo<T>>} */
        callbackInfos: new Set(),
        /** @type {Set<() => void>} */
        invalidationCallbacks: new Set(),
        /** @type {Set<() => void>} */
        onValidCallbacks: new Set(),
        /** @type {(() => void)[]} */
        onValidCallbackThenClear: [],
        valid: true,
        /** @type {(State | ConstState)[]} */
        validityDependents: []
    }

    /**
     * @param {T} initialValue
     * @param {StateOptions<T>} options
     */
    constructor(initialValue, options) {
        options ??= {};
        options.name ??= "Unnamed";
        options.validityDependents ??= [];
        
        this.#stateRef.value = initialValue;
        this.#stateRef.validityDependents = options.validityDependents
        this.#stateRef.invalidValue = options.invalidValue;
        this.#stateRef.name = options.name;

        for (const validityDependent of this.#stateRef.validityDependents) {
            if (options.addToCleanup === undefined) {
                throw new Error(`State variable ${this.#stateRef.name} does not have a cleanup collection specified for validity dependent states, one must be specified.`);
            }

            validityDependent.addOnValidCallback(this.#checkValidity.bind(this), options.addToCleanup);
        }
    }

    #getValueOptions() {
        let validOnly = () => { return this.#stateRef.value; };
        if (!this.isValid()) {
            validOnly = () => { throw new Error(`Trying to access current or previous invalid value on ${this.#stateRef.name}`); }
        }

        const invalidValueSubstitute = this.#stateRef.valid ? this.#stateRef.value : this.#stateRef.invalidValue;
        const previousValidSubstitute = this.#stateRef.valid ? this.#stateRef.value : this.#stateRef.previousValidValue;

        return {
            get validOnly() { return validOnly(); },
            invalidValueSubstitute,
            previousValidSubstitute
        };
    }

    /**
     * @param {StateCallback<T>} callback 
     * @param {(() => void)[]} addToCleanup
     * @param {StateCallbackOptions} options 
     */
    addOnUpdateCallback(callback, addToCleanup, options) {
        options ??= {};
        options.name ??= "Unnamed";
        options.name += ` provided by state ${this.#stateRef.name}`;
        options.whenInvalidSubstitute ??= "validOnly";
        if (addToCleanup === undefined) {
            throw new Error(`State variable ${this.#stateRef.name} does not have a cleanup collection specified for callback ${options.name}, one must be specified.`);
        }

        const callbackInfo = {callback, options};
        this.#stateRef.callbackInfos.add(callbackInfo);
        
        const cleanupFunction = () => {
            this.#stateRef.callbackInfos.delete(callbackInfo);
        };
        addToCleanup.push(cleanupFunction);
    }

    /**
     * @param {StateValueOptions<T>} valueOptions 
     * @param {StateValueOptions<T>} previousValueOptions 
     */
    #onUpdate(valueOptions, previousValueOptions) {
        for (const invalidationCallback of this.#stateRef.invalidationCallbacks) {
            invalidationCallback();
        }

        for (const callbackInfo of this.#stateRef.callbackInfos) {
            let whenInvalidSubstitute = callbackInfo.options.whenInvalidSubstitute;
            if (whenInvalidSubstitute === "no-update") {
                whenInvalidSubstitute = () => {};
            }
            if (typeof whenInvalidSubstitute === "function") {
                if (!this.isValid()) {
                    whenInvalidSubstitute();
                    continue;
                } else {
                    whenInvalidSubstitute = "validOnly";
                }
            }

            try {
                const value = valueOptions[whenInvalidSubstitute];
                const previousValue = previousValueOptions.invalidValueSubstitute;
                
                if (callbackInfo.options.requireChangeForUpdate === true) {
                    if (previousValue !== value) {
                        callbackInfo.callback(value, previousValue);
                    }
                } else {
                    callbackInfo.callback(value, previousValue);
                }
            } catch (e) {
                throw new Error(`Error "${e.message}" occurred within callback ${callbackInfo.options.name}`);
            }
        }
    }

    /**
     * @param {T} value 
     */
    set(value) {
        if (!this.isValid()) {
            throw new Error(`Setting value on invalid state ${this.#stateRef.name} without setting validity`);
        }

        const previousValueOptions = this.#getValueOptions();
        this.#stateRef.previousValidValue = this.#stateRef.value;
        this.#stateRef.value = value;
        this.#onUpdate(this.#getValueOptions(), previousValueOptions);
    }

    /**
     * @param {T} value 
     */
    setWithValidity(value) {
        const previousValueOptions = this.#getValueOptions();

        let updatedValidity = false;
        if (!this.#stateRef.valid) {
            updatedValidity = true;
            this.#stateRef.valid = true;
        } else {
            this.#stateRef.previousValidValue = this.#stateRef.value;
        }
        
        this.#stateRef.value = value;
        this.#onUpdate(this.#getValueOptions(), previousValueOptions);

        if (updatedValidity) {
            this.#onValid();
        }
    }

    /** @type {State<T>} */
    #movedFrom;
    /**
     * @param {State<T>} otherState 
     */
    consume(otherState) {
        const otherStateCallbacks = otherState.#stateRef.callbackInfos;
        for (const callback of otherStateCallbacks) {
            this.#stateRef.callbackInfos.add(callback)
        }

        // Move all moved from states to be equivalent to the current state
        this.#movedFrom = otherState
        let movedFromState = this.#movedFrom;
        while (movedFromState !== undefined) {
            movedFromState.#stateRef = this.#stateRef;

            movedFromState = movedFromState.#movedFrom;
        }

        this.#onUpdate(this.#getValueOptions(), otherState.#getValueOptions())
    }

    forceUpdate() {
        this.#onUpdate(this.#getValueOptions(), this.#getValueOptions());
    }

    /**
     * @param {InvalidSubstitute=} whenInvalidSubstitute
     * @returns {T}
     */
    get(whenInvalidSubstitute) {
        whenInvalidSubstitute ??= "validOnly";
        const valueOptions = this.#getValueOptions();
        return valueOptions[whenInvalidSubstitute];
    }

    /**
     * @returns {Promise<T>}
     */
    async getWhenValid() {
        if (this.isValid()) {
            return this.get();
        } else {
            return new Promise(resolve => {
                this.#stateRef.onValidCallbackThenClear.push(() => {
                    resolve(this.get());
                });
            })
        }
    }

    addOnValidCallback(callback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw new Error("State variable does not have a cleanup collection specified for onValid callback, one must be specified");
        }

        this.#stateRef.onValidCallbacks.add(callback);

        const cleanupFunction = () => {
            this.#stateRef.onValidCallbacks.delete(callback);
        }
        addToCleanup.push(cleanupFunction);
    }

    /**
     * @param {() => void} callback
     * @param {(() => void)[]} addToCleanup 
     */
    addInvalidationCallback(callback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw new Error("State variable does not have a cleanup collection specified for invalidation callback, one must be specified");
        }

        this.#stateRef.invalidationCallbacks.add(callback);

        const cleanupFunction = () => {
            this.#stateRef.invalidationCallbacks.delete(callback);
        }
        addToCleanup.push(cleanupFunction);
    }

    #onValid() {
        for (const callback of this.#stateRef.onValidCallbacks) {
            callback();
        }
        
        for (const callback of this.#stateRef.onValidCallbackThenClear) {
            callback();
        }
        this.#stateRef.onValidCallbackThenClear = [];
    }

    isValid() {
        return this.#stateRef.valid && this.#stateRef.validityDependents.every(state => state.isValid());
    }

    setInvalid() {
        if (this.#stateRef.valid) {
            this.#stateRef.valid = false;
            this.forceUpdate();
        }
    }

    #checkValidity() {
        if (this.isValid()) {
            this.#onValid();
        }
    }

    name() {
        return this.#stateRef.name;
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
        const state = new State(undefined, {validityDependents: [this], addToCleanup, invalidValue: options.invalidValue, name: options.name});

        this.addOnUpdateCallback(currentValue => {
            state.set(transform(currentValue))
        }, addToCleanup, {whenInvalidSubstitute: () => {
            state.forceUpdate();
        }, name: `${options.name} update callback from ${this.name()}`});
        state.set(transform(this.get()));

        return new ConstState(state);
    }

    /**
     * @template T, R1, R2, R3, R4, R5, R6, R7
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
     *     options: StateTransformOptions<any>=
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
     * @template T, R1, R2, R3, R4, R5, R6, R7
     * @type {AsAtomicTransformFunction<T, R1, R2, R3, R4, R5, R6, R7>}
     **/
    asAtomicTransforms(transforms, addToCleanup, options) {
        options ??= {};
        const states = transforms.map(() => new State(undefined, {validityDependents: [this], addToCleanup, invalidValue: options.invalidValue, name: options.name}));

        this.addOnUpdateCallback(currentValue => {
            for (let i = 0; i < transforms.length; ++i) {
                states[i].#stateRef.value = transforms[i](currentValue);
            }
            for (const state of states) {
                state.forceUpdate();
            }
        }, addToCleanup, {whenInvalidSubstitute: () => {
            for (const state of states) {
                state.forceUpdate();
            }
        }, name: `Atomic states ${options.name} update callback from ${this.name()}`});
        for (let i = 0; i < transforms.length; ++i) {
            states[i].#stateRef.value = transforms[i](this.get());
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
        const transformState = new State(undefined, {validityDependents: states, addToCleanup, invalidValue: options.invalidValue, name: options.name});

        for (const state of states) {
            state.addOnUpdateCallback(() => {
                transformState.set(transform());
            }, addToCleanup, {whenInvalidSubstitute: () => {
                transformState.forceUpdate();
            }, name: `${options.name} update callback from ${state.name()}`})
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
        options.invalidatesOn ??= [];

        /** @type {State<T>} */
        const transformState = new State(options.initialValue, {validityDependents: states, addToCleanup, invalidValue: options.invalidValue, name: options.name});
        for (const state of options.invalidatesOn) {
            state.addInvalidationCallback(() => {
                transformState.setInvalid();
            }, addToCleanup);
        }

        let updateNumber = 0;
        const updateTransformState = () => {
            let localUpdateNumber = ++updateNumber;
            asyncTransform().then(result => {
                if (localUpdateNumber < updateNumber) {
                    return;
                }

                transformState.setWithValidity(result);
            });
        }

        for (const state of states) {
            state.addOnUpdateCallback(
                updateTransformState,
                addToCleanup,
                {
                    whenInvalidSubstitute: () => { transformState.forceUpdate(); },
                    name: `${options.name} update callback from ${state.name()}`
                }
            )
        }

        if (options.updateOnCreate) {
            updateTransformState();
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

    /**
     * @param {InvalidSubstitute} whenInvalidSubstitute 
     */
    get(whenInvalidSubstitute) {
        return this.#state.get(whenInvalidSubstitute);
    }

    async getWhenValid() {
        return this.#state.getWhenValid();
    }

    /**
     * @param {() => void} callback 
     * @param {(() => void)[]} addToCleanup
     */
    addOnValidCallback(callback, addToCleanup) {
        this.#state.addOnValidCallback(callback, addToCleanup);
    }

    /**
     * @param {() => void} callback 
     * @param {(() => void)[]} addToCleanup
     */
    addInvalidationCallback(callback, addToCleanup) {
        this.#state.addInvalidationCallback(callback, addToCleanup);
    }

    isValid() {
        return this.#state.isValid();
    }

    hasValue() {
        return this.#state.hasValue();
    }

    checkValidity() {
        return this.#state.checkValidity();
    }

    name() {
        return this.#state.name();
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
     * @template T, R1, R2, R3, R4, R5, R6, R7
     * @type {AsAtomicTransformFunction<T, R1, R2, R3, R4, R5, R6, R7>}
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
    /** @type {Set<PersistentStateCallback>} */
    #callbacks = new Set();
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

    isClear() {
        return Object.keys(this.#priorState).length === 0 && this.#states.size === 0;
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

    /**
     * @param {string} key  
     */
    getVal(key) {
        const state = this.#states.get(key);
        if (state !== undefined) {
            return state.get();
        } else {
            return this.#priorState[key];
        }
    }
    
    toJSON() {
        const jsonState = this.#priorState;
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

        if (options.addToCleanup === undefined) {
            throw new Error("You must specify a cleanup function in options when registering a State to a PersistentState")
        }

        if (state instanceof ConstState) {
            if (options.isSaved) {
                throw new Error("state cannot be ConstState and saved as ConstState cannot be written to from the saved value");
            } else {
                delete this.#priorState[key];
            }
        }
        
        if (this.#states.has(key)) {
            state = this.#states.get(key);
        } else {
            this.#states.set(key, state);
        }

        if (options.isSaved === true) {
            this.#savedKeys.add(key);
        }

        if (this.#priorState[key] !== undefined) {
            state.set(this.#priorState[key]);
            delete this.#priorState[key];
        }
        state.addOnUpdateCallback(() => {this.#onUpdate();}, options.addToCleanup, {...options});
        return state;
    }

    /**
     * @param {PersistentStateCallback} callback 
     * @param {(() => void)[]} addToCleanup
     */
    addOnUpdateCallback(callback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array or null to indicate this object will not be cleaned up"
        }
        this.#callbacks.add(callback);
        if (addToCleanup === null) {
            return;
        }

        const cleanupFunction = () => {
            this.#callbacks.delete(callback);
        };
        addToCleanup.push(cleanupFunction);
    }
}