import { spawn } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export default class PerfTags {
    #closed = false;
    #closing = false;
    #perfTags;
    #inputFileName;
    #outputFileName;
    #databaseDirectory;
    #data = "";

    constructor(path, inputFileName, outputFileName, databaseDirectory) {
        path ??= "perftags.exe";

        this.#inputFileName = inputFileName ?? "perf-input.txt";
        this.#outputFileName = outputFileName ?? "perf-output.txt";
        this.#databaseDirectory = databaseDirectory ?? "database/tag-pairings";
        
        this.#perfTags = spawn(path, [this.#inputFileName, this.#outputFileName, this.#databaseDirectory]);

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
     * @param {bigint[]} files 
     */
    async insertFiles(files) {
        this.__writeToInputFile(PerfTags.#serializeSingles(files));
        this.#perfTags.stdin.write("insert_files\r\n");
        return await this.__dataOrTimeout("OK!\r\n", 1000);
    }
    
    /**
     * @param {bigint[]} tags 
     */
    async insertTags(tags) {
        this.__writeToInputFile(PerfTags.#serializeSingles(tags));
        this.#perfTags.stdin.write("insert_tags\r\n");
        return await this.__dataOrTimeout("OK!\r\n", 1000);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static #serializeTagPairings(tagPairings) {
        let bufSize = 0;
        for (const fileSet of tagPairings.values()) {
            bufSize += 8 * (fileSet.length + 2);
        }
        let buffer = Buffer.allocUnsafe(bufSize);
        let offset = 0;
        for (const [tag, fileSet] of tagPairings.entries()) {

            offset = buffer.writeBigUInt64BE(tag, offset);
            offset = buffer.writeBigUInt64BE(BigInt(fileSet.length), offset);
            for (const file of fileSet) {
                offset = buffer.writeBigUInt64BE(file, offset);
            }
        }
        return buffer;
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    async insertTagPairings(tagPairings) {
        this.__writeToInputFile(PerfTags.#serializeTagPairings(tagPairings));
        this.#perfTags.stdin.write("insert_tag_pairings\r\n");
        return await this.__dataOrTimeout("OK!\r\n", 100);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    async toggleTagPairings(tagPairings) {
        this.__writeToInputFile(PerfTags.#serializeTagPairings(tagPairings));
        this.#perfTags.stdin.write("toggle_tag_pairings\r\n");
        return await this.__dataOrTimeout("OK!\r\n", 100);
    }

    /**
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    async deleteTagPairings(tagPairings) {
        this.__writeToInputFile(PerfTags.#serializeTagPairings(tagPairings));
        this.#perfTags.stdin.write("delete_tag_pairings\r\n");
        return await this.__dataOrTimeout("OK!\r\n", 100);
    }

    /**
     * @param {bigint[]} files
     */
    async readFilesTags(files) {
        this.__writeToInputFile(PerfTags.#serializeSingles(files));
        this.#perfTags.stdin.write("read_files_tags\r\n");
        const ok = await this.__dataOrTimeout("OK!\r\n", 100);
        let filesTagsStr = this.__readFromOutputFile();
        /** @type {Map<bigint, bigint[]>} */
        const filePairings = new Map();
        for (let i = 0; i < filesTagsStr.length;) {
            const file = filesTagsStr.readBigUInt64BE(i)
            i += 8;
            const tagCount = filesTagsStr.readBigUInt64BE(i);
            i += 8;
            const tags = [];
            for (let j = 0; j < tagCount; ++j) {
                const tag = filesTagsStr.readBigUInt64BE(i);
                i += 8;

                tags.push(tag);
            }
            filePairings.set(file, tags);
        }
        return {ok, filePairings};
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

        this.#perfTags.stdin.write("exit\r\n");
        await this.__dataOrTimeout("OK!\r\n", 60000 * 30);
        this.#closed = true;
        return await this.__nonErrorExitOrTimeout(10000);
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

    /**
     * @param {string} data 
     */
    __writeToStdin(data) {
        this.#perfTags.stdin.write(data);
    }

    async __flushAndPurgeUnusedFiles() {
        this.#perfTags.stdin.write("flush_files\r\n");
        await this.__dataOrTimeout("OK!\r\n", 100);
        this.#perfTags.stdin.write("purge_unused_files\r\n");
        return await this.__dataOrTimeout("OK!\r\n", 100);
    }

    __kill() {
        this.#expectingError = true;
        this.#perfTags.kill();
    }

    #stderrListeners = new Set();
    __addStderrListener(listener) {
        this.#stderrListeners.add(listener);
    }

    #expectingError = false;
    __expectError() {
        this.#expectingError = true;
    }

    /**
     * 
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static getFilesFromTagPairings(tagPairings) {
        /** @type {Set<bigint>} */
        const files = new Set();
        for (const fileSet of tagPairings.values()) {
            for (const file of fileSet) {
                files.add(file);
            }
        }

        return [...files];
    }
    
    /**
     * 
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static getTagsFromTagPairings(tagPairings) {
        return [...tagPairings.keys()];
    }
}