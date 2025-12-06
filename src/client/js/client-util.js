/** @import {JSX} from "react" */

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

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
/**
 * @param {number} size 
 */
export function randomID(size) {
    let id = "";
    for (let i = 0; i < size; ++i) {
        const rnd = Math.floor(Math.random() * ALPHABET.length);
        id += ALPHABET[rnd];
    }

    return id;
}

let unusedIDCount = 1;
export function unusedID() {
    let id = "__u-";
    let idNumber = ++unusedIDCount;
    while (idNumber > 0) {
        id += ALPHABET[idNumber % ALPHABET.length];
        idNumber = Math.floor(idNumber / ALPHABET.length);
    }

    return id;
}

export function walkObject(object, replaceCallback) {
    let replacedObject = replaceCallback(object);
    if (replacedObject instanceof Array) {
        replacedObject = replacedObject.map(item => walkObject(item, replaceCallback));
    } else if (typeof replacedObject === "object" && replacedObject !== null) {
        const newReplacedObject = {};
        for (const key in replacedObject) {
            newReplacedObject[key] = walkObject(replacedObject[key], replaceCallback);
        }
        replacedObject = newReplacedObject;
    }

    return replacedObject;
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
 * @param {any} obj 
 * @returns {string} 
 */
export function clientjsonStringify(obj) {
    obj = walkObject(obj, (value) => {
        if (typeof value === "bigint") {
            return Number(value);
        } else if (value instanceof Buffer) {
            return value.toString("hex");
        } else {
            return value;
        }
    })
    return JSON.stringify(obj);
}

const BIG_INT_IDENTIFIER = "BigInt_fuihi873ohr87hnfuidwnfufh3e2oi8fwefa";
const SET_IDENTIFIER = "Set_fsdhkjafhsdkfjah";
const MAP_IDENTIFIER = "Map_fdjhuifhuiewhf";

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
        } else if (value instanceof Set) {
            return {
                [SET_IDENTIFIER]: [...value]
            }
        } else if (value instanceof Map) {
            return {
                [MAP_IDENTIFIER]: [...value]
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
        } else if (typeof value === "object" && value[SET_IDENTIFIER] !== undefined) {
            return new Set(value[SET_IDENTIFIER]);
        } else if (typeof value === "object" && value[MAP_IDENTIFIER] !== undefined) {
            return new Map(value[MAP_IDENTIFIER]);
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
export function serializeUint32(num) {
    let serialized = "";
    serialized += String.fromCharCode(Number((num >> 24) & 0xFF));
    serialized += String.fromCharCode(Number((num >> 16) & 0xFF));
    serialized += String.fromCharCode(Number((num >>  8) & 0xFF));
    serialized += String.fromCharCode(Number((num >>  0) & 0xFF));
    return serialized;
}
/**
 * @param {string} str 
 */
export function deserializeUint32(str) {
    let num = 0;
    num += str.charCodeAt(4) << 24;
    num += str.charCodeAt(5) << 16;
    num += str.charCodeAt(6) << 8;
    num += str.charCodeAt(7);
    return num;
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
    /** 
     * @type {Map<K, {
     *     value: V,
     *     status: "filled" | "awaiting",
     *     onFillCallbacks: (() => void)[]
     * }>}
     **/
    #state = new Map();
    static #defaultState() {
        return {value: undefined, status: "awaiting", onFillCallbacks: []};
    }

    clear() {
        this.#state = new Map();
    }

    /**
     * @param {K} key 
     */
    setAwaiting(key) {
        mapNullCoalesce(this.#state, key, RealizationMap.#defaultState());
    }

    /**
     * @param {K} key 
     * @param {V} value
     */
    set(key, value) {
        const keyState = mapNullCoalesce(this.#state, key, RealizationMap.#defaultState());
        keyState.value = value;
        keyState.status = "filled";
        for (const callback of keyState.onFillCallbacks) {
            callback();
        }
    }

    /**
     * @param {K} key 
     */
    async get(key) {
        const keyState = mapNullCoalesce(this.#state, key, RealizationMap.#defaultState());
        if (keyState?.status === "filled") {
            return keyState.value;
        } else {
            const getPromise = new Promise(resolve => {
                keyState.onFillCallbacks.push(() => {
                    resolve(this.#state.get(key).value);
                })
                if (keyState.status === "filled") {
                    resolve(keyState.value);
                }
            })

            return getPromise;
        }
    }

    /**
     * @param {K} key 
     */
    getOrUndefined(key) {
        const keyState = this.#state.get(key);
        if (keyState?.status === "filled") {
            return keyState.value;
        } else {
            return undefined;
        }
    }

    /**
     * @param {K} key 
     */
    getStatus(key) {
        return this.#state.get(key)?.status ?? "empty";
    }

    size() {
        return this.#state.size;
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
 * @returns {Map<K, V>}
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

/**
 * @template K, V
 */
class DoublyLinkedMap {
    /** @type {Map<K, V>} */
    #map = new Map();
    /** @type {Map<V, Set<K>>} */
    #inverseMap = new Map();

    constructor() {}

    set(key, value) {
        mapNullCoalesce(this.#inverseMap, this.#map.get(key), new Set()).delete(key);
        this.#map.set(key, value);
        mapNullCoalesce(this.#inverseMap, value, new Set()).add(key);
    }

    delete(key) {
        mapNullCoalesce(this.#inverseMap, this.#map.get(key), new Set()).delete(key);
        this.#map.delete(key);
    }

    get(key) {
        return this.#map.get(key);
    }

    getValue(value) {
        return this.#inverseMap.get(value);
    }
}

/**
 * @template T, G
 * @param {T[]} groupableItems 
 * @param {(groupableItem: T) => G[]} groupingCallback 
 */
export function mergeGroups(groupableItems, groupingCallback) {
    let currentGroupNum = {current: 0};
    /** @type {Map<G, {group: number, mergedGroups: Set<number>}} */
    const groupMap = new Map();
    /** @type {Map<G, T[]} */
    const groupingMemberMap = new Map();
    for (const groupableItem of groupableItems) {
        const groupingMembers = groupingCallback(groupableItem);
        mergeGroupsIntoGroupMap(groupMap, groupingMembers, currentGroupNum);
        for (const groupingMember of groupingMembers) {
            mapNullCoalesce(groupingMemberMap, groupingMember, []).push(groupableItem);
        }
    }

    const mergedGroups = getMergedGroups(groupMap);
    return mergedGroups.map(mergedGroup => ({
        group: mergedGroup.map(groupingMember => ({
            groupingMember,
            constituents: groupingMemberMap.get(groupingMember)
        })),
        constituents: [...new Set(mergedGroup.flatMap(groupingMember => groupingMemberMap.get(groupingMember)))]
    }));
}

/**
 * @template T
 * @param {Map<T, {group: number, mergedGroups: Set<number>}>} groupMap 
 * @param {T[]} groupedIDs 
 * @param {{current: number}} currentGroupNum
 */
export function mergeGroupsIntoGroupMap(groupMap, groupedIDs, currentGroupNum) {
    for (const id of groupedIDs) {
        const existingGroup = groupMap.get(id);
        if (existingGroup !== undefined) {
            for (const idInner of groupedIDs) {
                const innerGroup = groupMap.get(idInner);
                if (innerGroup !== undefined) {
                    existingGroup.mergedGroups.add(innerGroup.group);
                } else {
                    groupMap.set(idInner, existingGroup);
                }
            }
            return;
        }
    }
    
    const newGroup = ++currentGroupNum.current;
    const newGroupObj = {group: newGroup, mergedGroups: new Set([newGroup])}
    for (const id of groupedIDs) {
        groupMap.set(id, newGroupObj);
    }
}

/**
 * @template T
 * @param {Map<T, {group: number, mergedGroups: Set<number>}>} groupMap
 * @param {T} groupID
 * @param {T[]} existingGroupIDs 
 * @param {{current: number}} currentGroupNum
 */
export function mergeExistingGroupsIntoGroupMap(groupMap, groupID, existingGroupIDs, currentGroupNum) {
    for (const existingGroupID of existingGroupIDs) {
        const existingGroup = groupMap.get(existingGroupID);
        if (existingGroup !== undefined) {
            groupMap.set(groupID, existingGroup);
            for (const existingGroupIDInner of existingGroupIDs) {
                const existingGroupInner = groupMap.get(existingGroupIDInner);
                if (existingGroupInner !== undefined) {
                    existingGroup.mergedGroups.add(existingGroupInner.group);
                }
            }
            return;
        }
    }
    
    const newGroup = ++currentGroupNum.current;
    groupMap.set(groupID, {group: newGroup, mergedGroups: new Set([newGroup])});
}

/**
 * @template T
 * @param {Map<T, {group: number, mergedGroups: Set<number>}>} groupMap
 */
export function getMergedGroups(groupMap) {
    let currentMergedGroup = 1;
    /** @type {Set<number>} */
    const checkedGroups = new Set();
    /** @type {Map<number, number>} */
    const groupToMergedGroupMap = new Map();
    /** @type {Map<number, T[]>} */
    const mergedGroupMap = new Map();
    for (const [k, v] of groupMap) {
        if (!checkedGroups.has(v.group)) {
            let mergedGroup = groupToMergedGroupMap.get(v.group);
            for (const group of v.mergedGroups) {
                if (mergedGroup !== undefined) {
                    break;
                }

                mergedGroup = groupToMergedGroupMap.get(group);
            }

            if (mergedGroup === undefined) {
                mergedGroup = currentMergedGroup;
                mergedGroupMap.set(mergedGroup, []);
                ++currentMergedGroup;
            }

            for (const group of v.mergedGroups) {
                groupToMergedGroupMap.set(group, mergedGroup);
            }

            checkedGroups.add(v.group);
        }
        
        mergedGroupMap.get(groupToMergedGroupMap.get(v.group)).push(k);
    }

    return [...mergedGroupMap.values()];
}

/**
 * @template K, V, [V2=V]
 * @param {Map<K, V>} map
 * @param {(value: V) => V2} valueMappingFunction
 */
export function invertMap(map, valueMappingFunction) {
    valueMappingFunction ??= (value) => value;
    /** @type {Map<V2, K[]>} */
    const invertedMap = new Map();

    for (const [k, v] of map) {
        mapNullCoalesce(invertedMap, valueMappingFunction(v), []).push(k);
    }

    return invertedMap;
}

export const T_SECOND = 1000;
export const T_MINUTE = T_SECOND * 60;

export function concatCallback(callback, callback2) {
    return () => {
        callback();
        callback2();
    }
}

export function ReferenceableReact() {
    let reactRef = undefined;

    return {
        get dom() {
            return document.querySelector(`[data-react-ref=${reactRef}]`);
        },
        /**
         * @param {import("react").JSX.Element} jsx 
         */
        react(jsx) {
            reactRef = jsx.props['data-react-ref'];
            return jsx;
        }
    }
}