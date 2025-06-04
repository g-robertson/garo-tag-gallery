import { appendFileSync, createReadStream } from "fs";
import path from "path";
import { extractWith7Z, getAllFileEntries } from "../util.js";
/**
 * @import {Databases} from "./db-util.js"
 */

/**
 * 
 * @param {Databases} dbs 
 * @param {string[]} partialFilePaths 
 */
export async function importFilesFromHydrus(dbs, partialUploadFolder, partialFilePaths) {
    let leadFilePath;
    if (partialFilePaths.length === 1) {
        leadFilePath = partialFilePaths[0];
    } else {
        for (const filePath of partialFilePaths) {
            if (filePath.endsWith(".zip") || filePath.endsWith(".zip.001")) {
                leadFilePath = filePath;
                break;
            }
        }
    }

    if (leadFilePath === undefined) {
        return "No valid ZIP file found to import from";
    }



    const extractPath = path.join(partialUploadFolder, "export-path");
    extractWith7Z(leadFilePath, extractPath);

    const allFileEntries = getAllFileEntries(extractPath, {recursive: true});
    const EXTENSIONS = ["tags", "notes", "urls", "arctime", "modtime", "imptime", "deltime", "pimtime", "lavtime"].map(extension => ({
        name: extension,
        extension: `.${extension}.txt`
    }));
    const fileInfos = new Map();
    for (const fileEntry of allFileEntries) {
        const baseName = path.basename(fileEntry);
        let isSidecar = false;
        for (const {name: extensionName, extension} of EXTENSIONS) {
            if (baseName.endsWith(extension)) {
                const taggableFileName = baseName.slice(0, -extension.length);
                if (fileInfos.get(taggableFileName) === undefined) { fileInfos.set(taggableFileName, {}); }
                fileInfos.get(taggableFileName)[extensionName] = fileEntry;
                isSidecar = true;
                break;
            }
        }

        if (!isSidecar) {
            if (fileInfos.get(baseName) === undefined) { fileInfos.set(baseName, {}); }
            fileInfos.get(baseName).taggable = fileEntry;
        }
    }
    console.log(fileInfos);
}