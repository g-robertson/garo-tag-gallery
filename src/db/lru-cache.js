/**
 * @template K, V
 */
export class LRUCache {
    #maxEntries;

    /** @type {Map<K, {value: V, timestamp: number}>} */
    #backingMap = new Map();
    /** @type {{timestamp: number, key: K}[]} */
    #sortedItems = [];
    /**
     * @param {number} maxEntries 
     */
    constructor(maxEntries) {
        this.#maxEntries = maxEntries;
    }

    /**
     * @param {K} key 
     * @param {V} value 
     */
    set(key, value) {
        const timestamp = Date.now();
        this.delete(key);
        this.#backingMap.set(key, {value, timestamp});
        this.#sortedItems.push({
            key,
            timestamp
        });

        if (this.#sortedItems.length > this.#maxEntries) {
            this.delete(this.#sortedItems[0].key);
        }
    }

    /**
     * @param {K} key 
     */
    delete(key) {
        const entry = this.#backingMap.get(key);
        if (entry === undefined) {
            return false;
        }

        const {timestamp} = entry;
        this.#backingMap.delete(key);
        this.#sortedItems.splice(this.#sortedItems.findIndex((sortEntry) => {
            return sortEntry.timestamp === timestamp && sortEntry.key === key;
        }), 1);
    }

    get(key) {
        return this.#backingMap.get(key)?.value;
    }
}