import { spawn } from 'child_process';
import path from 'path';
import { serializeUint32, T_MINUTE } from '../client/js/client-util.js';
import { Mutex } from 'async-mutex';
import { mkdir, readFile, writeFile } from 'fs/promises';

export const HASH_ALGORITHMS = /** @type {const} */ ({
    MY_SHAPE_HASH: 'S'
});

/** @typedef {(typeof HASH_ALGORITHMS)[keyof typeof HASH_ALGORITHMS]} HashAlgorithmType */

/**
 * @import {Databases} from "../db/db-util.js"
 **/

const THIRTY_MINUTES = 30 * T_MINUTE;

export default class PerfImg {
    #closed = false;
    #closing = false;
    #perfImg;
    #path;
    #writeInputFileName;
    #writeOutputFileName;
    #writeMutex = new Mutex();
    #data = "";

    static EXE_NAME = process.platform === "win32" ? "perfimg.exe" : "perfimg";
    static NEWLINE = process.platform === "win32" ? "\r\n" : "\n";
    static OK_RESULT = `OK!${PerfImg.NEWLINE}`;

    __open() {
        this.#closed = false;
        this.#closing = false;
        this.#perfImg = spawn(this.#path, [this.#writeInputFileName, this.#writeOutputFileName]);
        if (this.#perfImg.pid === undefined) {
            throw "Perf hash cmp did not start with spawn arguments"
        }
        this.#perfImg.stdout.on("data", (chunk) => {
            this.#data += chunk;
            for (const dataCallback of this.#dataCallbacks) {
                dataCallback();  
            }
        });

        this.#perfImg.stderr.on("data", (chunk) => {
            for (const listener of this.#stderrListeners) {
                listener(chunk);
            }
        });

        this.#perfImg.on("error", () => {
            ++this.#errorCount;
            this.#errorCallback();
        });

        this.#perfImg.on("exit", () => {
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
        this.#path = path ?? `./${PerfImg.EXE_NAME}`;
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
     * @param {HashAlgorithmType} hashAlgorithm 
     * @param {number[]} fileIDs
     */
    async setComparedFiles(hashAlgorithm, fileIDs) {
        let comparedFileIDsString = `${hashAlgorithm}${serializeUint32(fileIDs.length)}`;
        for (const fileID of fileIDs) {
            comparedFileIDsString += serializeUint32(fileID);
        }

        await this.__writeToWriteInputFile(Buffer.from(comparedFileIDsString, 'binary'));
        await this.__writeLineToStdin("set_compared_files");
        const ok = await this.__dataOrTimeout(PerfImg.OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {HashAlgorithmType} hashAlgorithm
     * @param {Map<number, Buffer>} fileIDToHashMap 
     */
    async assignHashes(hashAlgorithm, fileIDToHashMap) {
        let assignedHashesString = `${hashAlgorithm}${serializeUint32(fileIDToHashMap.size)}`;
        for (const [fileID, hash] of fileIDToHashMap) {
            assignedHashesString += serializeUint32(fileID);
            assignedHashesString += serializeUint32(hash.length);
            assignedHashesString += hash.toString("binary");
        }

        await this.__writeToWriteInputFile(Buffer.from(assignedHashesString, 'binary'));
        await this.__writeLineToStdin("assign_hashes");
        const ok = await this.__dataOrTimeout(PerfImg.OK_RESULT, THIRTY_MINUTES);
    }
    
    /**
     * 
     * @param {{
     *     missingEntryWeight: number
     *     mulWeights: number[]
     *     powHundredthWeights: number[]
     * }} specificParams 
     */
    static myShapeHashSpecificParamsSerializer(specificParams) {
        let serializedParams = serializeUint32(specificParams.missingEntryWeight);
        serializedParams += serializeUint32(specificParams.mulWeights.length);
        for (let i = 0; i < specificParams.mulWeights.length; ++i) {
            serializedParams += `${serializeUint32(specificParams.mulWeights[i])}${serializeUint32(specificParams.powHundredthWeights[i])}`;
        }
        return serializedParams;
    }


    static ALGORITHM_TYPE_TO_SPECIFIC_PARAMS_SERIALIZER = {
        [HASH_ALGORITHMS.MY_SHAPE_HASH]: PerfImg.myShapeHashSpecificParamsSerializer
    }

    /**
     * @param {HashAlgorithmType} hashAlgorithm
     * @param {number} distanceCutoff
     * @param {any} specificParams
     */
    async compareHashes(hashAlgorithm, distanceCutoff, specificParams) {
        await this.#writeMutex.acquire();
        let compareHashesString = `${hashAlgorithm}${serializeUint32(distanceCutoff)}${PerfImg.ALGORITHM_TYPE_TO_SPECIFIC_PARAMS_SERIALIZER[hashAlgorithm](specificParams)}`

        await this.__writeToWriteInputFile(Buffer.from(compareHashesString, 'binary'));
        await this.__writeLineToStdin("compare_hashes");
        const ok = await this.__dataOrTimeout(PerfImg.OK_RESULT, THIRTY_MINUTES);

        /** @type {{hash1FileID: number, hash2FileID: number, distance: number}[]} */
        const comparisonsMade = [];
        let hashDistancesStr = await this.__readFromOutputFile();
        for (let i = 0; i < hashDistancesStr.length; i += 12) {
            const hash1FileID = hashDistancesStr.readInt32BE(i);
            const hash2FileID = hashDistancesStr.readInt32BE(i + 4);
            const distance = hashDistancesStr.readInt32BE(i + 8);
            comparisonsMade.push({
                hash1FileID, hash2FileID, distance
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
        await this.__dataOrTimeout(PerfImg.WRITE_OK_RESULT, THIRTY_MINUTES);
        this.#closed = true;
        const result = await this.__nonErrorExitOrTimeout(THIRTY_MINUTES);
        this.#writeMutex.release();
        return result;
    }

    __process() {
        return this.#perfImg;
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
        return await this.__writeToStdin(`${data}${PerfImg.NEWLINE}`);
    }

    /**
     * @param {string} data 
     */
    async __writeToStdin(data) {
        this.#perfImg.stdin.write(data);
    }

    #stderrListeners = new Set();
    /**
     * @param {(data: any) => void} listener 
     */
    __addStderrListener(listener) {
        this.#stderrListeners.add(listener);
    }
}