import path, { basename } from "path";
import { getAllFileEntries } from "../util.js";
import { readFile, rename } from "fs/promises";
import { mkdir } from "fs/promises";

export class FileStorage {
    #directory;

    /**
     * @param {string} directory 
     */
    constructor(directory) {
        this.#directory = directory;
    }

    directory() {
        return this.#directory;
    }

    /**
     * @param {string} from 
     * @param {string} fileName 
     * @param {Buffer} hash 
     */
    async move(from, fileName, hash) {
        const hashStr = hash.toString("hex");
        const dirUsed = path.join(this.#directory, hashStr.slice(0, 2), hashStr.slice(2, 4));
        const fileEndLocation = path.join(dirUsed, fileName);
        await mkdir(dirUsed, {recursive: true});
        await rename(from, fileEndLocation);
    }

    /**
     * @param {string} fileName 
     * @param {Buffer} hash 
     */
    async read(fileName, hash) {
        return readFile(this.getFilePath(fileName, hash));
    }

    /**
     * @param {string} fileName 
     * @param {Buffer} hash 
     */
    getFilePath(fileName, hash) {
        const hashStr = hash.toString("hex");
        const dirUsed = path.join(this.#directory, hashStr.slice(0, 2), hashStr.slice(2, 4));
        return path.join(dirUsed, fileName);
    }

    /**
     * 
     * @param {string} folder 
     * @param {(originalFileName: string) => string} modifyFileName
     * @param {{doNotMove: boolean}} options 
     */
    async extractAllTo(folder, modifyFileName, options) {
        modifyFileName ??= (originalFileName) => originalFileName;
        options ??= {};
        options.doNotMove ??= false;

        for (const fileEntry of await getAllFileEntries(this.#directory, {recursive: true})) {
            const fileName = basename(fileEntry);
            const modifiedFileName = modifyFileName(fileName);
            if (!options.doNotMove) {
                await rename(fileEntry, path.join(folder, modifiedFileName));
            } else {
                console.log(`Would have moved ${fileEntry} to ${path.join(folder, modifiedFileName)}`);
            }
        }

    }
}