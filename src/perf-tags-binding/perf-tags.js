import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { serializeUint64 } from '../client/js/client-util.js';

const THIRTY_MINUTES = 30 * 60 * 1000;

export default class PerfTags {
    #closed = false;
    #closing = false;
    #perfTags;
    #path;
    #inputFileName;
    #outputFileName;
    #databaseDirectory;
    #archiveDirectory;
    #stdinWrites = 0;
    #data = "";

    #promises = [];

    static EXE_NAME = process.platform === "win32" ? "perftags.exe" : "perftags";
    static NEWLINE = process.platform === "win32" ? "\r\n" : "\n";
    static OK_RESULT = `OK!${PerfTags.NEWLINE}`;

    __open() {
        this.#closed = false;
        this.#closing = false;
        this.#perfTags = spawn(this.#path, [this.#inputFileName, this.#outputFileName, this.#databaseDirectory]);
        if (this.#perfTags.pid === undefined) {
            throw "Perf tags did not start with spawn arguments"
        }
        this.#perfTags.stdout.on("data", (chunk) => {
            this.#data += chunk;
            this.#dataCallback();
        });

        this.#perfTags.stderr.on("data", (chunk) => {
            for (const listener of this.#stderrListeners) {
                listener(chunk);
            }
        })

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
            this.#dataCallback();
            this.#exitCallback();
        });
    }

    async reopen() {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        await this.close();
        this.__open();

        resolveCurrentExecution();
    }

    constructor(path, inputFileName, outputFileName, databaseDirectory, archiveDirectory) {
        this.#path = path ?? `./${PerfTags.EXE_NAME}`;
        this.#inputFileName = inputFileName ?? "perf-input.txt";
        this.#outputFileName = outputFileName ?? "perf-output.txt";
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

    #dataCallback = () => {}
    /**
     * 
     * @param {string} data 
     * @param {number} timeout 
     * @returns {Promise<boolean>}
     */
    __dataOrTimeout(data, timeout) {
        return new Promise(resolve => {
            const timeoutHandle = setTimeout(() => {
                resolve(false);
            }, timeout);

            this.#dataCallback = () => {
                if (this.#data.startsWith(data)) {
                    this.#data = this.#data.slice(data.length);
                    clearTimeout(timeoutHandle);
                    resolve(true);
                } else if (this.#closed) {
                    clearTimeout(timeoutHandle);
                    resolve(false);
                }
            };
            this.#dataCallback();            
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
        return buffer;
    }

    /**
     * @param {bigint[]} taggables 
     */
    async insertTaggables(taggables) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        const result = await this.__insertTaggables(taggables);

        resolveCurrentExecution();
        return result;
    }

    async __insertTaggables(taggables) {
        this.__writeToInputFile(PerfTags.#serializeSingles(taggables));
        await this.__writeLineToStdin("insert_taggables");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
    }
    
    /**
     * @param {bigint[]} tags 
     */
    async insertTags(tags) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        const result = await this.__insertTags(tags);

        resolveCurrentExecution();
        return result;
    }

    async __insertTags(tags) {
        this.__writeToInputFile(PerfTags.#serializeSingles(tags));
        await this.__writeLineToStdin("insert_tags");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
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
     */
    async insertTagPairings(tagPairings) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        await this.__insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await this.__insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        const result = await this.__insertTagPairings(tagPairings);

        resolveCurrentExecution();
        return result;
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings
     */
    async __insertTagPairings(tagPairings) {
        this.__writeToInputFile(PerfTags.#serializeTagPairings(tagPairings));
        await this.__writeLineToStdin("insert_tag_pairings");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    async toggleTagPairings(tagPairings) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        await this.__insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await this.__insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        const result = await this.__toggleTagPairings(tagPairings);

        resolveCurrentExecution();
        return result;
    }
    
    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    async __toggleTagPairings(tagPairings) {
        this.__writeToInputFile(PerfTags.#serializeTagPairings(tagPairings));
        await this.__writeLineToStdin("toggle_tag_pairings");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    async deleteTagPairings(tagPairings) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        this.__writeToInputFile(PerfTags.#serializeTagPairings(tagPairings));
        await this.__writeLineToStdin("delete_tag_pairings");
        const result = await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);

        resolveCurrentExecution();
        return result;
    }

    /**
     * @param {bigint[]} taggables
     */
    async readTaggablesTags(taggables) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();

        this.__writeToInputFile(PerfTags.#serializeSingles(taggables));
        await this.__writeLineToStdin("read_taggables_tags");
        const ok = await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
        let taggablesTagsStr = this.__readFromOutputFile();
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

        resolveCurrentExecution();
        return {ok, taggablePairings};
    }

    /**
     * @param {string} searchCriteria
     */
    async search(searchCriteria) {
        const resolveCurrentExecution = await this.__resolvePriorExecutions();
        
        this.__writeToInputFile(Buffer.from(searchCriteria, 'binary'));
        await this.__writeLineToStdin("search");
        const ok = await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
        let taggablesStr = this.__readFromOutputFile();
        /** @type {bigint[]} */
        const taggables = [];
        for (let i = 0; i  < taggablesStr.length; i += 8) {
            taggables.push(taggablesStr.readBigUInt64BE(i));
        }

        resolveCurrentExecution();
        return {ok, taggables};
    }

    /**
     * @param {bigint} tag
     */
    static searchTag(tag) {
        return `T${PerfTags.#serializeSingles([tag]).toString("binary")}`;
    }

    /**
     * @param {string} expression 
     */
    static searchComplement(expression) {
        return `~${expression}`;
    }

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
            return "";
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
            return "";
        }
        
        if (expressions.length === 1) {
            return expressions[0];
        }

        return `(${expressions.join('&')})`;
    }

    /**
     * @description Gets all taggables with {tags} where that tag is represented over {occurrences} amount of times within {expression}
     * @param {string} expression 
     * @param {bigint[]} tags 
     * @param {number} occurrences
     */
    static searchTagOccurrencesOverNWithinExpression(expression, tags, occurrences) {
        throw "unimplemented";
        return `(${expression}C>${serializeUint64(occurrences)}${serializeUint64(tags.length)}${this.#serializeSingles(tags)})`;
    }

        /**
     * @description Gets all taggables with {tags} where that tag is represented under {occurrences} amount of times within {expression}
     * @param {string} expression 
     * @param {bigint[]} tags 
     * @param {number} occurrences
     */
    static searchTagOccurrencesOverNWithinExpression(expression, tags, occurrences) {
        throw "unimplemented";
        return `(${expression}C<${serializeUint64(occurrences)}${serializeUint64(tags.length)}${this.#serializeSingles(tags)})`;
    }

    async beginTransaction() {
        await this.__writeLineToStdin("begin_transaction");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
    }

    async endTransaction() {
        await this.__writeLineToStdin("end_transaction");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
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
        if (this.#closing) {
            return;
        }
        this.#closing = true;

        await this.__writeLineToStdin("exit");
        await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
        this.#closed = true;
        return await this.__nonErrorExitOrTimeout(THIRTY_MINUTES);
    }

    __process() {
        return this.#perfTags;
    }

    /**
     * @param {Buffer} buffer 
     */
    __writeToInputFile(buffer) {
        mkdirSync(path.dirname(this.#inputFileName), {recursive: true});
        writeFileSync(this.#inputFileName, buffer);
    }
    __readFromOutputFile() {
        return readFileSync(this.#outputFileName);
    }

    async __resolvePriorExecutions() {
        const existingPromises = this.#promises.length;
        /** @type {() => void} */
        let resolveFn;
        this.#promises.push(new Promise(resolve => {
            resolveFn = () => {
                resolve();
                this.#promises = this.#promises.slice(1);
            }
        }));
        if (existingPromises > 0) {
            await this.#promises[existingPromises - 1];
        }
        return resolveFn;
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
            mkdirSync(this.#archiveDirectory, {recursive: true});
            writeFileSync(path.join(this.#archiveDirectory, `command-${this.#stdinWrites.toString().padStart(5, '0')}.txt`), data);
            if (existsSync(this.#inputFileName)) {
                writeFileSync(path.join(this.#archiveDirectory, `perf-input-${this.#stdinWrites.toString().padStart(5, '0')}.txt`), readFileSync(this.#inputFileName));
            } else {
                writeFileSync(path.join(this.#archiveDirectory, `perf-input-${this.#stdinWrites.toString().padStart(5, '0')}.txt`), "");
            }
        }
        this.#perfTags.stdin.write(data);
    }

    async __flushAndPurgeUnusedFiles() {
        await this.__writeLineToStdin("flush_files");
        await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
        await this.__writeLineToStdin("purge_unused_files");
        return await this.__dataOrTimeout(PerfTags.OK_RESULT, THIRTY_MINUTES);
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
                if (tagPairings.get(tag) === undefined) {
                    tagPairings.set(tag, []);
                }
                tagPairings.get(tag).push(taggable);
            }
        }
        return tagPairings;
    }
}