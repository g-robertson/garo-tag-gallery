/** @import {JSX} from "react" */

/**
 * @template {any} [T=Record<string, any]
 * @typedef {T & {displayName? string}} ExtraProperties
 */

/**
 * @typedef {Object} Modal
 * @property {JSX.Element} component
 * @property {string} displayName
 * @property {number=} width
 * @property {number=} height
 * @property {boolean=} hasTopbar
 * @property {number=} moveWithIndex
 * @property {boolean=} shrinkToContent
 */

/**
 * @template {any} [T=Record<string, any>]
 * @typedef {Object} ModalInstance
 * @property {() => Modal} modal
 * @property {ExtraProperties<T>} extraProperties
 * @property {(result: any) => void} resolve
 */

export class Modals {
    /** @type {ModalInstance[]} */
    #modals = [];
    /** @type {Set<() => void>} */
    #onUpdateCallbacks = new Set();
    /** @type {Set<(modalInstance: ModalInstance, index: number) => void>} */
    #onPushCallbacks = new Set();
    /** @type {Set<() => void>} */
    #onPopCallbacks = new Set();

    static #Gl_Modals = new Modals();

    static Global() {
        return Modals.#Gl_Modals;
    }

    /**
     * @param {Modals} newModals 
     */
    static makeGlobal(newModals) {
        newModals.#onUpdateCallbacks = Modals.#Gl_Modals.#onUpdateCallbacks;
        Modals.#Gl_Modals.#onUpdateCallbacks = new Set();
        Modals.#Gl_Modals = newModals;
        Modals.#Gl_Modals.#onUpdate();
    }

    get modals() {
        return this.#modals;
    }

    #onPop() {
        for (const callback of this.#onPopCallbacks) {
            callback();
        }
    }

    /**
     * @param {ModalInstance} modalInstance 
     */
    #onPush(modalInstance) {
        for (const callback of this.#onPushCallbacks) {
            callback(modalInstance, this.#modals.length - 1);
        }
    }

    #onUpdate() {
        for (const callback of this.#onUpdateCallbacks) {
            callback();
        }
    }
    
    /**
     * @param {() => void} onUpdateCallback
     * @param {(() => void)[]} addToCleanup
     */
    addOnUpdateCallback(onUpdateCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback to a modal";
        }

        this.#onUpdateCallbacks.add(onUpdateCallback);

        addToCleanup.push(() => {
            this.#onUpdateCallbacks.delete(onUpdateCallback);
        });
    }

    /**
     * @param {() => void} onPushCallback
     * @param {(() => void)[]} addToCleanup
     */
    addOnPushCallback(onPushCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback to a modal";
        }

        this.#onPushCallbacks.add(onPushCallback);

        addToCleanup.push(() => {
            this.#onPushCallbacks.delete(onPushCallback);
        });
    }

    /**
     * @param {() => void} onPopCallback
     * @param {(() => void)[]} addToCleanup
     */
    addOnPopCallback(onPopCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback to a modal";
        }

        this.#onPopCallbacks.add(onPopCallback);

        addToCleanup.push(() => {
            this.#onPopCallbacks.delete(onPopCallback);
        });
    }

    /**
     * @param {() => Modal} modal
     * @param {ExtraProperties=} extraProperties
     */
    async pushModal(modal, extraProperties) {
        extraProperties ??= {};
        const self = this;
        return new Promise(resolve => {
            self.#modals.push({
                modal,
                extraProperties,
                resolve
            });
            self.#onPush(self.#modals[self.#modals.length - 1]);
            self.#onUpdate();
        });
    }

    popModal() {
        this.#modals.pop().resolve();
        this.#onPop();
        this.#onUpdate();
    }
}