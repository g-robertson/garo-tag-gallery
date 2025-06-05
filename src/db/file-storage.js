import {mkdirSync, readFileSync, renameSync} from "fs";
import path, { basename } from "path";
import { getAllFileEntries } from "../util.js";

export class FileStorage {
    #directory;

    /**
     * @param {string} directory 
     */
    constructor(directory) {
        this.#directory = directory;
    }

    /**
     * 
     * @param {string} from 
     * @param {string} fileName 
     * @param {Buffer} hash 
     */
    move(from, fileName, hash) {
        const hashStr = hash.toString("hex");
        const dirUsed = path.join(this.#directory, hashStr.slice(0, 2), hashStr.slice(2, 4));
        const fileEndLocation = path.join(dirUsed, fileName);
        mkdirSync(dirUsed, {recursive: true});
        renameSync(from, fileEndLocation);
    }

    /**
     * 
     * @param {string} fileName 
     * @param {Buffer} hash 
     */
    read(fileName, hash) {
        const hashStr = hash.toString("hex");
        const dirUsed = path.join(this.#directory, hashStr.slice(0, 2), hashStr.slice(2, 4));
        const fileEndLocation = path.join(dirUsed, fileName);
        readFileSync(fileEndLocation);
    }

    extractAllTo(folder) {
        for (const fileEntry of getAllFileEntries(this.#directory, {recursive: true})) {
            const fileName = basename(fileEntry);
            renameSync(fileEntry, path.join(folder, fileName));
        }

    }
}