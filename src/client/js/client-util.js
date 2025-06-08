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

export function bjsonParse(json) {
    return JSON.parse(json, (key, value) => {
        if (typeof value === "object" && value[BIG_INT_IDENTIFIER] !== undefined) {
            return BigInt(value[BIG_INT_IDENTIFIER]);
        } else {
            return value;
        }
    })
}

/**
 * 
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
 * 
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