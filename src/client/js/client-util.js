/**
 * @param {Response} response 
 */
export async function fjsonParse(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (err) {
        console.error(`${err}: JSON Text was "${text}" for response from "${response.url}"`);
    }
}

/**
 * @param {Response} response 
 */
export async function fbjsonParse(response) {
    const text = await response.text();
    try {
        return bjsonParse(text);
    } catch (err) {
        console.error(`${err}: JSON Text was "${text}" for response from "${response.url}"`);
    }
}

/**
 * @param {string} json 
 */
export function tjsonParse(json) {
    try {
        return JSON.parse(json);
    } catch (err) {
        return;
    }
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
/**
 * 
 * @param {number} size 
 */
export function randomID(size) {
    let id = "";
    for (let i = 0; i < size; ++i) {
        const rnd = Math.floor(Math.random() * 26);
        id += ALPHABET[rnd];
    }

    return id;
}


const BIG_INT_IDENTIFIER = "BigInt_fuihi873ohr87hnfuidwnfufh3e2oi8fwefa";

/**
 * @param {string} json 
 * @returns {any} 
 */
export function abjsonParse(json) {
    const items = [];
    const itemsStr = json.slice(json.indexOf("[") + 1, json.lastIndexOf("]"));
    let itemCount = 0;
    const itemsSplit = itemsStr.split(`"DELIMITER__fuihi873ohr87hnfuidwnfufh3e2oi8fwefa__"`);
    for (let itemStr of itemsSplit) {
        ++itemCount;
        if (itemCount === 1) {
            itemStr = itemStr.slice(0, itemStr.lastIndexOf(","));
        } else if (itemCount === itemsSplit.length) {
            itemStr = itemStr.slice(itemStr.indexOf(",") + 1);
        } else {
            itemStr = itemStr.slice(itemStr.indexOf(",") + 1, itemStr.lastIndexOf(","));
        }
        items.push(bjsonParse(itemStr));
    }

    return items;
}

/**
 * @param {any[]} obj 
 */
export function* abjsonStringify(obj) {
    yield "[";
    if (obj.length !== 0) {
        yield bjsonStringify(obj[0]);
        for (const elem of obj.slice(1)) {
            yield `,"DELIMITER__fuihi873ohr87hnfuidwnfufh3e2oi8fwefa__",`;
            yield bjsonStringify(elem);
        }
    }
    yield "]";
}

/**
 * @param {any} obj 
 * @returns {string} 
 */
export function bjsonStringify(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === "bigint") {
            return {
                [BIG_INT_IDENTIFIER]: value.toString()
            }
        } else {
            return value;
        }
    })
}

/**
 * @param {string} json 
 * @returns {any} 
 */
export function bjsonParse(json) {
    return JSON.parse(json, (key, value) => {
        if (value === null) {
            return null;
        } else if (typeof value === "object" && value[BIG_INT_IDENTIFIER] !== undefined) {
            return BigInt(value[BIG_INT_IDENTIFIER]);
        } else {
            return value;
        }
    })
}

/**
 * @param {Set} set1 
 * @param {Set} set2 
 */
export function setEquals(set1, set2) {
    if (set1.size !== set2.size) {
        return false;
    }

    for (const elem of set1) {
        if (!set2.has(elem)) {
            return false;
        }
    }

    return true;
}

export function replaceObject(objDest, objSrc) {
    for (const key in objDest) {
        delete objDest[key];
    }
    for (const key in objSrc) {
        objDest[key] = objSrc[key];
    }
}

/**
 * @param {bigint} num 
 */
export function serializeUint64(num) {
    let serialized = "";
    serialized += String.fromCharCode(Number((num >> 56n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >> 48n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >> 40n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >> 32n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >> 24n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >> 16n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >>  8n) & 0xFFn));
    serialized += String.fromCharCode(Number((num >>  0n) & 0xFFn));
    return serialized;
}
/**
 * @param {string} str 
 */
export function deserializeUint64(str) {
    let num = 0n;
    num += BigInt(str.charCodeAt(0)) << 56n;
    num += BigInt(str.charCodeAt(1)) << 48n;
    num += BigInt(str.charCodeAt(2)) << 40n;
    num += BigInt(str.charCodeAt(3)) << 32n;
    num += BigInt(str.charCodeAt(4)) << 24n;
    num += BigInt(str.charCodeAt(5)) << 16n;
    num += BigInt(str.charCodeAt(6)) << 8n;
    num += BigInt(str.charCodeAt(7));
    return num;
}

/**
 * @param {number} number
 * @param {number} lower 
 * @param {number} upper 
 */
export function clamp(number, lower, upper) {
    if (number < lower) {
        return lower;
    } else if (number > upper) {
        return upper;
    }
    return number;
}

/**
 * @template {Map} T
 * @param {T} map 
 * @param {Parameters<Map<number, string>['has']>>[0]} key
 * @param {ReturnType<T['get']>} value
 * @returns {ReturnType<T['get']>}
 */
export function mapNullCoalesce(map, key, value) {
    let mapValue = map.get(key);
    if (mapValue === undefined) {
        mapValue = value;
        map.set(key, mapValue);
    }
    return mapValue;
}

/**
 * @template K, V
 */
export class RealizationMap {
    /** @type {Map<K, T>} */
    #values = new Map();
    /** @type {Map<string, "filled" | "awaiting">} */
    #valueStatuses = new Map();
    /** @type {Map<K, (() => void)[]>} */
    #valueOnFillCallbacks = new Map();
    
    /**
     * @param {K} key 
     */
    setAwaiting(key) {
        this.#valueStatuses.set(key, "awaiting");
    }

    /**
     * @param {K} key 
     * @param {V} value
     */
    set(key, value) {
        this.#values.set(key, value);
        this.#valueStatuses.set(key, "filled");
        const callbacks = this.#valueOnFillCallbacks.get(key);
        if (callbacks === undefined) {
            return;
        } else {
            for (const callback of callbacks) {
                callback();
            }
        }
    }

    /**
     * @param {K} key 
     */
    async get(key) {
        if (this.#valueStatuses.get(key) === "filled") {
            return this.#values.get(key);
        } else {
            const getPromise = new Promise(resolve => {
                mapNullCoalesce(this.#valueOnFillCallbacks, key, []);
                this.#valueOnFillCallbacks.get(key).push(() => {
                    resolve(this.#values.get(key));
                });
                if (this.#valueStatuses.get(key) === "filled") {
                    resolve(this.#values.get(key));
                }
            })

            return getPromise;
        }
    }

    /**
     * @param {K} key 
     */
    getOrUndefined(key) {
        if (this.#valueStatuses.get(key) === "filled") {
            return this.#values.get(key);
        } else {
            return undefined;
        }
    }

    /**
     * @param {K} key 
     */
    getStatus(key) {
        return this.#valueStatuses.get(key) ?? "empty";
    }

    size() {
        return this.#valueStatuses.size;
    }
}

/**
 * @template T
 * @param {Set<T>[]} sets 
 */
export function setIntersect(sets) {
    if (sets.length === 0) {
        return new Set();
    }

    const intersection = new Set(sets[0]);
    for (let i = 1; i < sets.length; ++i) {
        const set = sets[i];
        for (const item of intersection) {
            if (!set.has(item)) {
                intersection.delete(item);
            }
        }
    }

    return intersection;
}

/**
 * @template K, V
 * @param {Map<K, V>[]} maps 
 */
export function mapUnion(maps) {
    if (maps.length === 0) {
        return new Map();
    }

    const union = new Map(maps[0]);
    for (let i = 1; i < maps.length; ++i) {
        const map = maps[i];
        for (const [key, value] of map) {
            union.set(key, value);
        }
    }
    
    return union;
}

const ENDPOINTS = Object.freeze({
    "tags-from-local-tag-services": 0,
    "search-taggables": 0
});

export class FetchCache {
    /** @type {Map<keyof ENDPOINTS, RealizationMap<string, any>>} */
    #cache;
    rerender = () => {};

    constructor() {
        this.#generateTagsCache();
    }

    #generateTagsCache() {
        this.#cache = new Map(Object.keys(ENDPOINTS).map(endpoint => [
            endpoint,
            new RealizationMap()
        ]));
    }

    regenerateTagsCache() {
        this.rerender();
    }

    /**
     * @param {keyof ENDPOINTS} cache 
     */
    cache(cache) {
        return this.#cache.get(cache);
    }
}