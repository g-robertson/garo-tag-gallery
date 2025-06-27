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