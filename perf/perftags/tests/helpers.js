import {deserializeUint64, serializeUint64} from "../../../src/client/js/client-util.js";
import PerfTags from "../../../src/perf-tags-binding/perf-tags.js";
import { getAllFileEntries } from "../../../src/util.js";
import {stat} from "fs/promises";
/**
 * @typedef {(...args: ConstructorParameters<typeof PerfTags>) => PerfTags} PerfTagsCtor
 * @typedef {(createPerfTags: PerfTagsCtor) => Promise<void>} TestFunction
 */

/**
 * 
 * @param {Record<string, string[]>} strTagPairings 
 * @returns {Map<bigint, bigint[]>}
 */

export const TEST_DEFAULT_PERF_EXE = `./perftags-test${PerfTags.EXE_NAME.slice("perftags".length)}`;
export const TEST_DEFAULT_PERF_WRITE_INPUT = "test-dir/perf-write-input.txt";
export const TEST_DEFAULT_PERF_READ_INPUT = "test-dir/perf-read-input.txt";
export const TEST_DEFAULT_DATABASE_DIR = "test-dir/database-dir";
export const TEST_DEFAULT_PERF_TAGS_ARGS = [
    TEST_DEFAULT_PERF_EXE,
    TEST_DEFAULT_PERF_WRITE_INPUT,
    "test-dir/perf-write-output.txt",
    TEST_DEFAULT_PERF_READ_INPUT,
    "test-dir/perf-read-output.txt",
    TEST_DEFAULT_DATABASE_DIR,
    "test-dir/archive"
];

export function getPairingsFromStrPairings(strTagPairings) {
    const output = new Map();
    for (const tag in strTagPairings) {
        const tagFiles = [];
        for (const file of strTagPairings[tag]) {
            tagFiles.push(deserializeUint64(file));
        }
        output.set(deserializeUint64(tag), tagFiles);
    }

    return output;
}

/**
 * @param {Map<bigint, bigint[]>} pairings
 * @returns {Record<string, string[]>}
 */
export function getStrPairingsFromPairings(pairings) {
    const output = {};
    for (const [first, secondSet] of pairings.entries()) {
        const strFirst = serializeUint64(first);
        const seconds = [];
        for (const second of secondSet) {
            seconds.push(serializeUint64(second));
        }
        output[strFirst] = seconds;
    }

    return output;
}

export async function getTotalDirectoryBytes(directory) {
    let totalBytes = 0;
    for (const fileEntry of await getAllFileEntries(directory, {recursive: true})) {
        totalBytes += await stat(fileEntry).size;
    }
    return totalBytes;
}

/**
 * @param {Record<string, string[]} filePairings 
 */
export function strTaggablePairingsToStrTagPairings(filePairings) {
    /** @type {Record<string, string[]} */
    const strTagPairings = {};
    for (const file in filePairings) {
        for (const tag of filePairings[file]) {
            strTagPairings[tag] ??= [];
            strTagPairings[tag].push(file);
        }
    }

    return strTagPairings;
}