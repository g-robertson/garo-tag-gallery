import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { mapNullCoalesce, serializeUint64 } from '../client/js/client-util.js';
import { Mutex } from 'async-mutex';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { serializeFloat } from '../util.js';

/** @import {Databases} from "../db/db-util.js" */
/** @import {ClientComparator} from "../api/post/search-taggables.js" */

const THIRTY_MINUTES = 30 * 60 * 1000;

export default class PerfTags {
    #closed = false;
    #closing = false;
    #perfTags;
    #path;
    #writeInputFileName;
    #readInputFileName;
    #writeOutputFileName;
    #readOutputFileName;
    #databaseDirectory;
    #archiveDirectory;
    #stdinWrites = 0;
    #data = "";
    #writeMutex = new Mutex();
    #readMutex = new Mutex();
    #unflushedData = false;

    static EXE_NAME = process.platform === "win32" ? "perftags.exe" : "perftags";
    static NEWLINE = process.platform === "win32" ? "\r\n" : "\n";
    static WRITE_OK_RESULT = `WRITE_OK!${PerfTags.NEWLINE}`;
    static READ_OK_RESULT = `READ_OK!${PerfTags.NEWLINE}`;

    __open() {
        this.#closed = false;
        this.#closing = false;
        this.#perfTags = spawn(this.#path, [this.#writeInputFileName, this.#writeOutputFileName, this.#readInputFileName, this.#readOutputFileName, this.#databaseDirectory]);
        if (this.#perfTags.pid === undefined) {
            throw "Perf tags did not start with spawn arguments"
        }
        this.#perfTags.stdout.on("data", (chunk) => {
            this.#data += chunk;
            for (const dataCallback of this.#dataCallbacks) {
                dataCallback();  
            }
        });

        this.#perfTags.stderr.on("data", (chunk) => {
            for (const listener of this.#stderrListeners) {
                listener(chunk);
            }
        });

        this.#perfTags.on("error", () => {
            ++this.#errorCount;
            this.#errorCallback();
        });

        this.#perfTags.on("exit", () => {
            if (!this.#closed && !this.#expectingError) {
                throw "Perf tags exited before close was called";
            }

            this.#closed = true;
            ++this.#exitCount;
            for (const dataCallback of this.#dataCallbacks) {
                dataCallback();  
            }
            this.#exitCallback();
        });

        setInterval(async () => {
            if (this.#unflushedData && !this.#closed) {
                await this.flushData();
            }
        }, 15000);
    }

    async reopen() {
        await this.close();
        this.__open();
    }

    constructor(path, writeInputFileName, writeOutputFileName, readInputFileName, readOutputFileName, databaseDirectory, archiveDirectory) {
        this.#path = path ?? `./${PerfTags.EXE_NAME}`;
        this.#writeInputFileName = writeInputFileName ?? "perf-write-input.txt";
        this.#writeOutputFileName = writeOutputFileName ?? "perf-write-output.txt";
        this.#readInputFileName = readInputFileName ?? "perf-read-input.txt";
        this.#readOutputFileName = readOutputFileName ?? "perf-read-output.txt";
        this.#databaseDirectory = databaseDirectory ?? "database/tag-pairings";
        this.#archiveDirectory = archiveDirectory;

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
     * @param {bigint[]} numbers 
     */
    static #serializeSingles(numbers) {
        let offset = 0;
        let buffer = Buffer.allocUnsafe(numbers.length * 8);
        for (const number of numbers) {
            offset = buffer.writeBigUInt64BE(number, offset);
        }
        return buffer.toString("binary");
    }

    /**
     * @param {bigint[]} taggables 
     * @param {boolean=} inTransaction
     */
    async insertTaggables(taggables, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        const result = await this.__insertTaggables(taggables);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }

    async __insertTaggables(taggables) {
        await this.__writeToWriteInputFile(PerfTags.#serializeSingles(taggables));
        await this.__writeLineToStdin("insert_taggables");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }
    
    /**
     * @param {bigint[]} tags 
     * @param {boolean=} inTransaction
     */
    async insertTags(tags, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        const result = await this.__insertTags(tags);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }

    async __insertTags(tags) {
        await this.__writeToWriteInputFile(PerfTags.#serializeSingles(tags));
        await this.__writeLineToStdin("insert_tags");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static #serializeTagPairings(tagPairings) {
        let bufSize = 0;
        for (const taggableSet of tagPairings.values()) {
            bufSize += 8 * (taggableSet.length + 2);
        }
        let buffer = Buffer.allocUnsafe(bufSize);
        let offset = 0;
        for (const [tag, taggableSet] of tagPairings.entries()) {

            offset = buffer.writeBigUInt64BE(tag, offset);
            offset = buffer.writeBigUInt64BE(BigInt(taggableSet.length), offset);
            for (const taggable of taggableSet) {
                offset = buffer.writeBigUInt64BE(taggable, offset);
            }
        }
        return buffer;
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     * @param {boolean=} inTransaction
     */
    async insertTagPairings(tagPairings, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        await this.__insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await this.__insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        const result = await this.__insertTagPairings(tagPairings);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     */
    async __insertTagPairings(tagPairings) {
        await this.__writeToWriteInputFile(PerfTags.#serializeTagPairings(tagPairings));
        await this.__writeLineToStdin("insert_tag_pairings");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     * @param {boolean=} inTransaction
     */
    async toggleTagPairings(tagPairings, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        await this.__insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await this.__insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        const result = await this.__toggleTagPairings(tagPairings);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }
    
    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     */
    async __toggleTagPairings(tagPairings) {
        await this.__writeToWriteInputFile(PerfTags.#serializeTagPairings(tagPairings));
        await this.__writeLineToStdin("toggle_tag_pairings");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     * @param {boolean=} inTransaction
     */
    async deleteTagPairings(tagPairings, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        await this.__insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await this.__insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        const result = await this.__deleteTagPairings(tagPairings);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     */
    async __deleteTagPairings(tagPairings) {
        await this.__writeToWriteInputFile(PerfTags.#serializeTagPairings(tagPairings));
        await this.__writeLineToStdin("delete_tag_pairings");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {bigint[]} tags
     * @param {boolean=} inTransaction
     */
    async deleteTags(tags, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        await this.__writeToWriteInputFile(PerfTags.#serializeSingles(tags));
        await this.__writeLineToStdin("delete_tags");
        const result = await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }
    
    /**
     * @param {bigint[]} taggables
     * @param {boolean=} inTransaction
     */
    async deleteTaggables(taggables, inTransaction = false) {
        if (!inTransaction) {
            await this.#writeMutex.acquire();
        }

        await this.__writeToWriteInputFile(PerfTags.#serializeSingles(taggables));
        await this.__writeLineToStdin("delete_taggables");
        const result = await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
        this.#unflushedData = true;

        if (!inTransaction) {
            this.#writeMutex.release();
        }
        return result;
    }

    /**
     * @param {bigint[][]} tagGroups 
     * @param {string=} search
     */
    async readTagGroupsTaggableCounts(tagGroups, search) {
        search ??= "";
        await this.#readMutex.acquire();

        const tagGroupsTagsSerialized = tagGroups.map(tags => `${serializeUint64(BigInt(tags.length))}${PerfTags.#serializeSingles(tags)}`).join('');
        
        await this.__writeToReadInputFile(`${serializeUint64(BigInt(tagGroups.length))}${tagGroupsTagsSerialized}${search}`);
        await this.__writeLineToStdin("read_tag_groups_taggable_counts");
        const ok = await this.__dataOrTimeout(PerfTags.READ_OK_RESULT, 1000);
        let tagsTaggableCountsStr = await this.__readFromOutputFile();
        /** @type {number[]} */
        const tagGroupsTaggableCounts = [];
        for (let i = 0; i < tagsTaggableCountsStr.length;) {
            const taggableGroupCount = Number(tagsTaggableCountsStr.readBigUInt64BE(i));
            i += 8;
            tagGroupsTaggableCounts.push(taggableGroupCount);
        }

        this.#readMutex.release();
        return {ok, tagGroupsTaggableCounts};
    }

    /**
     * @param {bigint[]} taggables
     */
    async readTaggablesTags(taggables) {
        await this.#readMutex.acquire();

        await this.__writeToReadInputFile(PerfTags.#serializeSingles(taggables));
        await this.__writeLineToStdin("read_taggables_tags");
        const ok = await this.__dataOrTimeout(PerfTags.READ_OK_RESULT, THIRTY_MINUTES);
        let taggablesTagsStr = await this.__readFromOutputFile();
        /** @type {Map<bigint, bigint[]>} */
        const taggablePairings = new Map();
        for (let i = 0; i < taggablesTagsStr.length;) {
            const taggable = taggablesTagsStr.readBigUInt64BE(i);
            i += 8;
            const tagCount = taggablesTagsStr.readBigUInt64BE(i);
            i += 8;
            const tags = [];
            for (let j = 0; j < tagCount; ++j) {
                const tag = taggablesTagsStr.readBigUInt64BE(i);
                i += 8;

                tags.push(tag);
            }
            taggablePairings.set(taggable, tags);
        }

        this.#readMutex.release();
        return {ok, taggablePairings};
    }

    /**
     * @param {string} searchCriteria
     * @param {boolean=} inTransaction
     */
    async search(searchCriteria) {
        await this.#readMutex.acquire();

        await this.__writeToReadInputFile(Buffer.from(searchCriteria, 'binary'));
        await this.__writeLineToStdin("search");
        const ok = await this.__dataOrTimeout(PerfTags.READ_OK_RESULT, THIRTY_MINUTES);
        let taggablesStr = await this.__readFromOutputFile();
        /** @type {bigint[]} */
        const taggables = [];
        for (let i = 0; i  < taggablesStr.length; i += 8) {
            taggables.push(taggablesStr.readBigUInt64BE(i));
        }

        this.#readMutex.release();
        return {ok, taggables};
    }

    /**
     * @param {bigint} tag
     */
    static searchTag(tag) {
        return `T${PerfTags.#serializeSingles([tag])}`;
    }

    /**
     * @param {bigint[]} taggables 
     */
    static searchTaggableList(taggables) {
        return `L${serializeUint64(BigInt(taggables.length))}${PerfTags.#serializeSingles(taggables)}`;
    }

    /**
     * @param {string} expression 
     */
    static searchComplement(expression) {
        return `~${expression}`;
    }

    static SEARCH_UNIVERSE = "U";
    static SEARCH_EMPTY_SET = "E";

    /**
     * @param {string[]} expressions
     */
    static searchUnion(expressions) {
        for (const expression of expressions) {
            if (typeof expression !== "string") {
                throw "Expression in search union was not a string";
            }
        }

        if (expressions.length === 0) {
            // Empty set
            return PerfTags.SEARCH_EMPTY_SET;
        }

        if (expressions.length === 1) {
            return expressions[0];
        }

        
        return `(${expressions.join('|')})`;
    }

    /**
     * @param {string[]} expressions
     */
    static searchIntersect(expressions) {
        for (const expression of expressions) {
            if (typeof expression !== "string") {
                throw "Expression in search intersect was not a string";
            }
        }

        if (expressions.length === 0) {
            return PerfTags.SEARCH_UNIVERSE;
        }
        
        if (expressions.length === 1) {
            return expressions[0];
        }

        return `(${expressions.join('&')})`;
    }

    /**
     * @param {ClientComparator} comparator 
     */
    static __comparatorToPerfTagsComparator(comparator) {
        if (comparator === "<") {
            return "< ";
        } else if (comparator === ">") {
            return "> ";
        } else {
            return comparator;
        }
    }

    /**
     * @param {string[]} conditions 
     * @param {bigint[]} tags
     */
    static searchAggregateConditions(tags, conditions) {
        return `A${serializeUint64(BigInt(tags.length))}${this.#serializeSingles(tags)}${conditions.join('')})`;
    }

    /**
     * @description Gets all taggables with tags where that tag is represented {comparator} {occurrences} amount of times within {expression}
     * @param {string} expression 
     * @param {ClientComparator} comparator
     * @param {number} occurrences
     */
    static aggregateConditionTagOccurrencesComparedToNWithinExpression(expression, comparator, occurrences) {
        if (!Number.isSafeInteger(occurrences)) {
            throw "occurrences was not a safe integer";
        }
        return `C${PerfTags.__comparatorToPerfTagsComparator(comparator)}${serializeUint64(BigInt(occurrences))}${expression})`;
    }
    
    /**
     * @description Gets all taggables with tags where that tag is represented {comparator} {percentage} within {expression}
     * @param {string} expression 
     * @param {ClientComparator} comparator
     * @param {number} percentage
     */
    static aggregateConditionTagOccurrencesComparedToNPercentWithinExpression(expression, comparator, percentage) {
        return `P${PerfTags.__comparatorToPerfTagsComparator(comparator)}${serializeFloat(percentage)}${expression})`;
    }
    
    /**
     * @description Gets all taggables filtered by {filteringExpression} with tags where that tag is represented {comparator} {percentage} within {expression}
     * @param {string} filteringExpression
     * @param {string} expression 
     * @param {ClientComparator} comparator
     * @param {number} percentage
     */
    static aggregateConditionFilteredTagOccurrencesComparedToNPercentWithinExpression(filteringExpression, expression, comparator, percentage) {
        return `F${PerfTags.__comparatorToPerfTagsComparator(comparator)}${serializeFloat(percentage)}${filteringExpression})${expression})`;
    }

    async beginTransaction() {
        await this.#writeMutex.acquire();
        await this.__writeLineToStdin("begin_transaction");
        const result = await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
        return {result};
    }

    async endTransaction() {
        await this.__writeLineToStdin("end_transaction");
        await this.__flushData();
        const result = await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
        this.#writeMutex.release();
        return result;
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
        await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
        this.#closed = true;
        const result = await this.__nonErrorExitOrTimeout(THIRTY_MINUTES);
        this.#writeMutex.release();
        return result;
    }

    __process() {
        return this.#perfTags;
    }

    /**
     * @param {Buffer} buffer 
     */
    async __writeToWriteInputFile(buffer) {
        await mkdir(path.dirname(this.#writeInputFileName), {recursive: true});
        await writeFile(this.#writeInputFileName, buffer, {encoding: "binary"});
    }
    /**
     * @param {Buffer} buffer 
     */
    async __writeToReadInputFile(buffer) {
        await mkdir(path.dirname(this.#readInputFileName), {recursive: true});
        await writeFile(this.#readInputFileName, buffer, {encoding: "binary"});
    }
    async __readFromOutputFile() {
        return await readFile(this.#readOutputFileName);
    }

    /**
     * @param {string} data 
     */
    async __writeLineToStdin(data) {
        return await this.__writeToStdin(`${data}${PerfTags.NEWLINE}`);
    }

    /**
     * @param {string} data 
     */
    async __writeToStdin(data) {
        ++this.#stdinWrites;
        if (this.#archiveDirectory !== undefined) {
            await mkdir(this.#archiveDirectory, {recursive: true});
            await writeFile(path.join(this.#archiveDirectory, `command-${this.#stdinWrites.toString().padStart(5, '0')}.txt`), data);
            if (existsSync(this.#writeInputFileName)) {
                await writeFile(path.join(this.#archiveDirectory, `${path.basename(this.#writeInputFileName)}-${this.#stdinWrites.toString().padStart(5, '0')}.txt`), await readFile(this.#writeInputFileName));
            }
            if (existsSync(this.#readInputFileName)) {
                await writeFile(path.join(this.#archiveDirectory, `${path.basename(this.#readInputFileName)}-${this.#stdinWrites.toString().padStart(5, '0')}.txt`), await readFile(this.#readInputFileName));
            }
        }
        
        this.#perfTags.stdin.write(data);
    }

    async flushData() {
        await this.#writeMutex.acquire();
        await this.__flushData();
        this.#writeMutex.release();
    }

    async __flushData() {
        await this.__writeLineToStdin("flush_files");
        await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    async __flushAndPurgeUnusedFiles() {
        await this.flushData();
        await this.__writeLineToStdin("purge_unused_files");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    async __override(overrideString) {
        await this.__writeToWriteInputFile(overrideString);
        await this.__writeLineToStdin("override");
        return await this.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, THIRTY_MINUTES);
    }

    __kill() {
        this.#expectingError = true;
        this.#perfTags.kill();
    }

    #stderrListeners = new Set();
    /**
     * @param {(data: any) => void} listener 
     */
    __addStderrListener(listener) {
        this.#stderrListeners.add(listener);
    }

    #expectingError = false;
    __expectError() {
        this.#expectingError = true;
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static getTaggablesFromTagPairings(tagPairings) {
        /** @type {Set<bigint>} */
        const taggables = new Set();
        for (const taggableSet of tagPairings.values()) {
            for (const taggable of taggableSet) {
                taggables.add(taggable);
            }
        }

        return [...taggables];
    }
    
    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static getTagsFromTagPairings(tagPairings) {
        return [...tagPairings.keys()];
    }

    /**
     * @param {Map<bigint, bigint[]} taggablePairings 
     */
    static getTagPairingsFromTaggablePairings(taggablePairings) {
        /** @type {Map<bigint, bigint[]>} */
        const tagPairings = new Map();
        for (const [taggable, tags] of taggablePairings) {
            for (const tag of tags) {
                const tagPairing = mapNullCoalesce(tagPairings, tag, []);
                tagPairing.push(taggable);
            }
        }
        return tagPairings;
    }
}