import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { mapNullCoalesce, serializeUint32, T_MINUTE } from '../client/js/client-util.js';
import { Mutex } from 'async-mutex';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { serializeFloat } from '../util.js';
import { z } from 'zod';

/** @import {Databases} from "../db/db-util.js" */
/** @import {ClientComparator} from "../api/post/search-taggables.js" */

const THIRTY_MINUTES = 30 * T_MINUTE;

export default class PerfHashCmp {
    #closed = false;
    #closing = false;
    #perfHashCmp;
    #path;
    #writeInputFileName;
    #writeOutputFileName;
    #writeMutex = new Mutex();
    #data = "";

    static EXE_NAME = process.platform === "win32" ? "perfhashcmp.exe" : "perfhashcmp";
    static NEWLINE = process.platform === "win32" ? "\r\n" : "\n";
    static OK_RESULT = `OK!${PerfHashCmp.NEWLINE}`;

    __open() {
        this.#closed = false;
        this.#closing = false;
        this.#perfHashCmp = spawn(this.#path, [this.#writeInputFileName, this.#writeOutputFileName]);
        if (this.#perfHashCmp.pid === undefined) {
            throw "Perf hash cmp did not start with spawn arguments"
        }
        this.#perfHashCmp.stdout.on("data", (chunk) => {
            this.#data += chunk;
            for (const dataCallback of this.#dataCallbacks) {
                dataCallback();  
            }
        });

        this.#perfHashCmp.stderr.on("data", (chunk) => {
            for (const listener of this.#stderrListeners) {
                listener(chunk);
            }
        });

        this.#perfHashCmp.on("error", () => {
            ++this.#errorCount;
            this.#errorCallback();
        });

        this.#perfHashCmp.on("exit", () => {
            if (!this.#closed) {
                throw "Perf hash cmp exited before close was called";
            }

            this.#closed = true;
            ++this.#exitCount;
            for (const dataCallback of this.#dataCallbacks) {
                dataCallback();  
            }
            this.#exitCallback();
        });
    }

    async reopen() {
        await this.close();
        this.__open();
    }

    constructor(path, writeInputFileName, writeOutputFileName) {
        this.#path = path ?? `./${PerfHashCmp.EXE_NAME}`;
        this.#writeInputFileName = writeInputFileName ?? "hash-write-input.txt";
        this.#writeOutputFileName = writeOutputFileName ?? "hash-write-output.txt";

        this.__open();
    }

    #errorCount = 0;
    #errorCallback = () => {}
    __errorOrTimeout(timeout) {
        return new Promise(resolve => {
            const timeoutHandle = setTimeout(() => {
                resolve(false);
            }, timeout);

            this.#errorCallback = () => {
                if (this.#errorCount > 0) {
                    --this.#errorCount;
                    resolve(true);
                    clearTimeout(timeoutHandle);
                }
            };
            this.#errorCallback();

        });
    };

    #dataCallbacks = [];
    /**
     * @param {string} data 
     * @param {number} timeout 
     * @returns {Promise<boolean>}
     */
    __dataOrTimeout(data, timeout) {
        return new Promise(resolve => {
            const timeoutHandle = setTimeout(() => {
                resolve(false);
            }, timeout);

            const myDataCallback = () => {
                if (this.#data.startsWith(data)) {
                    this.#data = this.#data.slice(data.length);
                    // delete self from data callbacks
                    const callbackIndex = this.#dataCallbacks.findIndex(callback => callback === myDataCallback);
                    if (callbackIndex !== -1) {
                        this.#dataCallbacks.splice(callbackIndex, 1);
                    }
                    clearTimeout(timeoutHandle);
                    for (const dataCallback of this.#dataCallbacks) {
                        dataCallback();
                    }
                    resolve(true);
                } else if (this.#closed) {
                    clearTimeout(timeoutHandle);
                    resolve(false);
                }
            };
            this.#dataCallbacks.push(myDataCallback);
            myDataCallback();          
        });
    }

    /**
     * @param {number[]} numbers 
     */
    static #serializeSingles(numbers) {
        let offset = 0;
        let buffer = Buffer.allocUnsafe(numbers.length * 4);
        for (const number of numbers) {
            offset = buffer.writeUint32BE(number, offset);
        }
        return buffer.toString("binary");
    }

    /**
     * @param {Buffer[]} alreadyComparedHashes
     */
    async setAlreadyComparedHashes(alreadyComparedHashes) {
        let hashComparisonString = serializeUint32(alreadyComparedHashes.length);
        for (const hash of alreadyComparedHashes) {
            hashComparisonString += `${serializeUint32(hash.length)}${hash.toString("binary")}`;
        }

        await this.__writeToWriteInputFile(Buffer.from(hashComparisonString, 'binary'));
        await this.__writeLineToStdin("set_already_compared");
        const ok = await this.__dataOrTimeout(PerfHashCmp.OK_RESULT, THIRTY_MINUTES);
    }
    
    /**
     * @param {number} distanceCutoff
     * @param {number} missingEntryWeight 
     * @param {number[]} mulWeights 
     * @param {number[]} powHundredthWeights
     * @param {Buffer[]} toCompareHashes
     */
    async compareHashes(distanceCutoff, missingEntryWeight, mulWeights, powHundredthWeights, toCompareHashes) {
        await this.#writeMutex.acquire();
        const distanceCutoffStr = serializeUint32(distanceCutoff);
        const missingEntryWeightStr = serializeUint32(missingEntryWeight);
        const weightsStr = `${serializeUint32(mulWeights.length)}${PerfHashCmp.#serializeSingles(mulWeights)}${PerfHashCmp.#serializeSingles(powHundredthWeights)}`;
        let hashComparisonString = `${distanceCutoffStr}${missingEntryWeightStr}${weightsStr}${serializeUint32(toCompareHashes.length)}`;
        
        for (const hash of toCompareHashes) {
            hashComparisonString += `${serializeUint32(hash.length)}${hash.toString("binary")}`;
        }
        await this.__writeToWriteInputFile(Buffer.from(hashComparisonString, 'binary'));
        await this.__writeLineToStdin("compare_hashes");
        const ok = await this.__dataOrTimeout(PerfHashCmp.OK_RESULT, THIRTY_MINUTES);

        /** @type {{hash1Index: number, hash2Index: number, distance: number}[]} */
        const comparisonsMade = [];
        let hashDistancesStr = await this.__readFromOutputFile();
        for (let i = 0; i < hashDistancesStr.length; i += 12) {
            const hash1Index = hashDistancesStr.readInt32BE(i);
            const hash2Index = hashDistancesStr.readInt32BE(i + 4);
            const distance = hashDistancesStr.readInt32BE(i + 8);
            comparisonsMade.push({
                hash1Index, hash2Index, distance
            });
        }
        this.#writeMutex.release();

        return {ok, comparisonsMade};
    }

    #exitCount = 0;
    #exitCallback = () => {}
    /**
     * 
     * @param {number} timeout 
     * @returns {Promise<boolean>}
     */
    __nonErrorExitOrTimeout(timeout) {
        return new Promise(resolve => {
            const timeoutHandle = setTimeout(() => {
                resolve(false);
            }, timeout);

            this.#exitCallback = () => {
                if (this.#errorCount > 0) {
                    clearTimeout(timeoutHandle);
                    resolve(false);
                }

                if (this.#exitCount > 0) {
                    --this.#exitCount;
                    clearTimeout(timeoutHandle);
                    resolve(true);
                }
            };
            this.#exitCallback();

        });
    };
    async close() {
        await this.#writeMutex.acquire();
        if (this.#closing) {
            return;
        }
        this.#closing = true;

        await this.__writeLineToStdin("exit");
        await this.__dataOrTimeout(PerfHashCmp.WRITE_OK_RESULT, THIRTY_MINUTES);
        this.#closed = true;
        const result = await this.__nonErrorExitOrTimeout(THIRTY_MINUTES);
        this.#writeMutex.release();
        return result;
    }

    __process() {
        return this.#perfHashCmp;
    }

    /**
     * @param {Buffer} buffer 
     */
    async __writeToWriteInputFile(buffer) {
        await mkdir(path.dirname(this.#writeInputFileName), {recursive: true});
        await writeFile(this.#writeInputFileName, buffer, {encoding: "binary"});
    }
    async __readFromOutputFile() {
        return await readFile(this.#writeOutputFileName);
    }

    /**
     * @param {string} data 
     */
    async __writeLineToStdin(data) {
        return await this.__writeToStdin(`${data}${PerfHashCmp.NEWLINE}`);
    }

    /**
     * @param {string} data 
     */
    async __writeToStdin(data) {
        this.#perfHashCmp.stdin.write(data);
    }

    #stderrListeners = new Set();
    /**
     * @param {(data: any) => void} listener 
     */
    __addStderrListener(listener) {
        this.#stderrListeners.add(listener);
    }
}