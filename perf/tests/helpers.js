import { writeFileSync, readFileSync, appendFileSync } from 'fs';
import { spawn } from 'child_process';

export function serializeUint64(num) {
    const bigNum = BigInt(num);
    let serialized = "";
    serialized += String.fromCharCode(Number((bigNum >> 56n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >> 48n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >> 40n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >> 32n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >> 24n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >> 16n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >>  8n) & 0xFFn));
    serialized += String.fromCharCode(Number((bigNum >>  0n) & 0xFFn));
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
    return Number(num);
}

export function getTagsStr(tagPairings) {
    let buffer = "";

    const usedTags = {};
    for (const tag in tagPairings) {
        if (usedTags[tag] === undefined) {
            usedTags[tag] = true;
            buffer += tag;
        }
    }

    return buffer;
}

export function getFilesStr(tagPairings) {
    let buffer = "";

    const usedFiles = {};
    for (const tag in tagPairings) {
        for (const file of tagPairings[tag]) {
            if (usedFiles[file] === undefined) {
                usedFiles[file] = true;
                buffer += file;
            }
        }
    }

    return buffer;
}

export function getTagPairingsStr(tagPairings) {
    let buffer = "";
    for (const tag in tagPairings) {
        buffer += tag;
        buffer += serializeUint64(tagPairings[tag].length);
        for (const file of tagPairings[tag]) {
            buffer += file;
        }
    }
    return buffer;
}

export function filePairingsToTagPairings(filePairings) {
    const tagPairings = {};
    for (const file in filePairings) {
        for (const tag of filePairings[file]) {
            tagPairings[tag] ??= [];
            tagPairings[tag].push(file);
        }
    }

    return tagPairings;
}

/**
 * @param {ReturnType<typeof getCurrentPerfTags>} perfTags 
 * @param {string} filesStr 
 */
export async function insertFiles(perfTags, filesStr) {
    writeFileSync("perf-input.txt", filesStr);
    perfTags.perfTags.stdin.write("insert_files\r\n");
    return await perfTags.dataOrTimeout("OK!\r\n", 100);
}

/**
 * @param {ReturnType<typeof getCurrentPerfTags>} perfTags 
 * @param {string} tagsStr 
 */
export async function insertTags(perfTags, tagsStr) {
    writeFileSync("perf-input.txt", tagsStr);
    perfTags.perfTags.stdin.write("insert_tags\r\n");
    return await perfTags.dataOrTimeout("OK!\r\n", 100);
}

/**
 * @param {ReturnType<typeof getCurrentPerfTags>} perfTags 
 * @param {string} tagPairingsStr 
 */
export async function insertTagPairings(perfTags, tagPairingsStr) {
    writeFileSync("perf-input.txt", tagPairingsStr);
    perfTags.perfTags.stdin.write("insert_tag_pairings\r\n");
    return await perfTags.dataOrTimeout("OK!\r\n", 100);
}

/**
 * @param {ReturnType<typeof getCurrentPerfTags>} perfTags 
 * @param {string} tagPairingsStr 
 */
export async function toggleTagPairings(perfTags, tagPairingsStr) {
    writeFileSync("perf-input.txt", tagPairingsStr);
    perfTags.perfTags.stdin.write("toggle_tag_pairings\r\n");
    return await perfTags.dataOrTimeout("OK!\r\n", 100);
}

/**
 * @param {ReturnType<typeof getCurrentPerfTags>} perfTags 
 * @param {string} tagPairingsStr 
 */
export async function deleteTagPairings(perfTags, tagPairingsStr) {
    writeFileSync("perf-input.txt", tagPairingsStr);
    perfTags.perfTags.stdin.write("delete_tag_pairings\r\n");
    return await perfTags.dataOrTimeout("OK!\r\n", 100);
}

/**
 * @param {ReturnType<typeof getCurrentPerfTags>} perfTags 
 * @param {string} filesStr 
 */
export async function readFilesTags(perfTags, filesStr) {
    writeFileSync("perf-input.txt", filesStr);
    perfTags.perfTags.stdin.write("read_files_tags\r\n");
    const oked = await perfTags.dataOrTimeout("OK!\r\n", 100);
    let filesTagsStr = readFileSync("perf-output.txt").toString();
    const filePairings = {};
    while (filesTagsStr.length > 0) {
        const file = filesTagsStr.slice(0, 8);
        filesTagsStr = filesTagsStr.slice(8);
        const tagCount = deserializeUint64(filesTagsStr.slice(0, 8));
        filesTagsStr = filesTagsStr.slice(8);
        filePairings[file] = [];
        for (let i = 0; i < tagCount; ++i) {
            const tag = filesTagsStr.slice(0, 8);
            filesTagsStr = filesTagsStr.slice(8);

            filePairings[file].push(tag);
        }
    }
    return {oked, filePairings};
}
let PERF_TAGS_DATA = "";
let PERF_TAGS_DATA_CALLBACKS = {};
let PERF_TAGS_EXITS = 0;
let PERF_TAGS_EXIT_CALLBACKS = {};
let PERF_TAGS_ERRORS = 0;
let PERF_TAGS_ERROR_CALLBACKS = {};
/**
 * @param {string} data 
 * @param {number} timeout 
 * @returns {Promise<bool>}
 */

/** @type {ReturnType<typeof spawn>} */
let CURRENT_PERF_TAGS;
export function getCurrentPerfTags() {
    if (CURRENT_PERF_TAGS === undefined) {
        CURRENT_PERF_TAGS = spawn("perftags.exe");
    }
    CURRENT_PERF_TAGS.stdout.on("data", data => {
        PERF_TAGS_DATA += data;
        for (const key in PERF_TAGS_DATA_CALLBACKS) {
            PERF_TAGS_DATA_CALLBACKS[key]();
        }
    });

    CURRENT_PERF_TAGS.stderr.on("data", data => {
        appendFileSync("err.log", data);
    });

    CURRENT_PERF_TAGS.on("exit", () => {
        if (CURRENT_PERF_TAGS !== undefined && CURRENT_PERF_TAGS.exitCode !== 0) {
            ++PERF_TAGS_ERRORS;
            for (const key in PERF_TAGS_EXIT_CALLBACKS) {
                PERF_TAGS_ERROR_CALLBACKS[key]();
            }
        }
        
        ++PERF_TAGS_EXITS;
        for (const key in PERF_TAGS_EXIT_CALLBACKS) {
            PERF_TAGS_EXIT_CALLBACKS[key]();
        }
        CURRENT_PERF_TAGS = undefined;
    });

    const errorOrTimeout = (timeout) => {
        return new Promise(resolve => {
            const errorCallback = () => {
                if (PERF_TAGS_ERRORS > 0) {
                    --PERF_TAGS_ERRORS;
                    resolve(true);
                }
            };
            PERF_TAGS_ERROR_CALLBACKS['main'] = errorCallback;
            errorCallback();

            setTimeout(() => {
                resolve(false);
            }, timeout);
        });
    };

    const nonErrorExitOrTimeout = (timeout) => {
        return new Promise(resolve => {
            const exitCallback = () => {
                if (PERF_TAGS_ERRORS > 0) {
                    resolve(false);
                }

                if (PERF_TAGS_EXITS > 0) {
                    --PERF_TAGS_EXITS;
                    resolve(true);
                }
            };
            PERF_TAGS_EXIT_CALLBACKS['main'] = exitCallback;
            exitCallback();

            setTimeout(() => {
                resolve(false);
            }, timeout);
        });
    };

    const dataOrTimeout = (data, timeout) => {
        return new Promise(resolve => {
            const dataCallback = () => {
                if (PERF_TAGS_DATA.startsWith(data)) {
                    PERF_TAGS_DATA = PERF_TAGS_DATA.slice(data.length);
                    resolve(true);
                }
            };
            PERF_TAGS_DATA_CALLBACKS['main'] = dataCallback;
            dataCallback();

            setTimeout(() => {
                resolve(false);
            }, timeout);
        });
    }

    return {perfTags: CURRENT_PERF_TAGS, errorOrTimeout, nonErrorExitOrTimeout, dataOrTimeout};
}

export function resetCurrentPerfTags() {
    PERF_TAGS_DATA = "";
    PERF_TAGS_ERRORS = 0;
    PERF_TAGS_EXITS = 0;
}

export async function exitCurrentPerfTags() {
    const {perfTags, nonErrorExitOrTimeout} = getCurrentPerfTags();
    perfTags.stdin.write("exit\r\n");
    await nonErrorExitOrTimeout(100);
}

export async function killCurrentPerfTags() {
    const {perfTags, nonErrorExitOrTimeout} = getCurrentPerfTags();
    perfTags.kill();
    await nonErrorExitOrTimeout(100);
}

export async function getNewPerfTags() {
    await exitCurrentPerfTags();
    return getCurrentPerfTags();
}