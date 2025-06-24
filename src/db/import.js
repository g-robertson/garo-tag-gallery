import path from "path";
import { extractWith7Z, getAllFileEntries, sha256 } from "../util.js";
import { dbBeginTransaction, dbEndTransaction } from "./db-util.js";
import { LocalTags, Namespaces, TagsNamespaces, Tags } from "./tags.js";
import { normalPreInsertLocalTag, localTagsPKHash, normalizeFileExtension } from "../client/js/tags.js";
import { LocalFiles, LocalTaggableServices, Taggables } from "./taggables.js";
import { addNotesToTaggables } from "./notes.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";
import { Job } from "./job-manager.js";
import { readFile } from "fs/promises";
/**
 * @import {Databases} from "./db-util.js"
 * @import {PreInsertLocalTag, URLAssociation} from "./tags.js"
 * @import {PreInsertLocalFile} from "./taggables.js"
 * @import {PreInsertNote} from "./notes.js"
 */

/**
 * 
 * @param {Databases} dbs
 * @param {string} partialUploadFolder
 * @param {string[]} partialFilePaths
 * @param {number} localTagServiceID
 * @param {number} localTaggableServiceID
 */
export function importFilesFromHydrusJob(dbs, partialUploadFolder, partialFilePaths, localTagServiceID, localTaggableServiceID) {
    return new Job({durationBetweenTasks: 250}, async function*() {
        yield {upcomingSubtasks: 1};

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
        await extractWith7Z(leadFilePath, extractPath);
    
        yield {upcomingSubtasks: 1};
        const allFileEntries = await getAllFileEntries(extractPath, {recursive: true});
        const EXTENSIONS = ["tags", "notes", "urls", "arctime", "modtime", "imptime", "deltime", "pimtime", "lavtime"].map(extension => ({
            name: extension,
            extension: `.${extension}.txt`
        }));
        /** @type {Map<string, Record<string, string>>} */
        const fileInfos = new Map();
        for (const fileEntry of allFileEntries) {
            const baseName = path.basename(fileEntry);
            if (baseName.endsWith(".thumb.jpg") || baseName.endsWith(".prethumb.jpg")) {
                continue;
            }
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
                if (fileInfos.get(baseName).fileLocation) { throw "two files with same basename"; }
                fileInfos.get(baseName).fileLocation = fileEntry;
            }
        }

        yield {remainingSubtasks: fileInfos.size};

        const newImportChunks = () => {
            return {
                length: 0,
                /** @type {Map<string, PreInsertLocalFile} */
                filePairings: new Map(),
                /** @type {Map<string, URLAssociation[]} */
                urlPairings: new Map(),
                /** @type {Map<string, PreInsertNote[]} */
                notePairings: new Map(),
                /** @type {Map<string, (PreInsertLocalTag & {Namespace_Names: string[]})[]} */
                tagPairings: new Map(),
                /** @type {Map<string, number>} */
                modifiedTimePairings: new Map(),
                /** @type {Map<string, number>} */
                importedTimePairings: new Map(),
                /** @type {Map<string, number>} */
                deletedTimePairings: new Map(),
                /** @type {Map<string, number>} */
                lastViewedTimePairings: new Map(),
                /** @type {Set<string>} */
                usedFiles: new Set()
            }
        }

        let importChunks = newImportChunks();

        const inLocalTaggableServiceTagID = (await LocalTaggableServices.selectTagMapping(dbs, localTaggableServiceID)).Tag_ID;

        const insertImportChunks = async () => {
            const dbsTransaction = await dbBeginTransaction(dbs);

            // insert file info
            const {dbLocalFiles, finalizeFileMove} = await LocalFiles.upsertMany(dbsTransaction, [...importChunks.filePairings.values()], inLocalTaggableServiceTagID);
            const dbLocalFilesMap = new Map(dbLocalFiles.map(dbFile => [dbFile.File_Hash.toString("hex"), dbFile]));
            /** @type {Map<string, string>} */
            const dbFileHashMap = new Map();
            for (const [fileName, fileInfo] of importChunks.filePairings.entries()) {
                dbFileHashMap.set(fileName, fileInfo.File_Hash.toString("hex"));
            }
            
            // insert notes
            /** @type {Map<bigint, PreInsertNote[]>} */
            const notePairings = new Map();

            for (const [fileName, notes] of importChunks.notePairings) {
                notePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, notes);
            }
            await addNotesToTaggables(dbsTransaction, notePairings);

            // upsert urls to taggables
            /** @type {Map<bigint, URLAssociation[]>} */
            const taggableURLAssociationPairings = new Map();
            for (const [fileName, urlAssociations] of importChunks.urlPairings.entries()) {
                const dbLocalFileTaggable = dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID;
                taggableURLAssociationPairings.set(dbLocalFileTaggable, urlAssociations)
            }
            await Taggables.upsertURLAssociations(dbsTransaction, taggableURLAssociationPairings);

            // insert dates
            const createdDatePairings = new Map();
            for (const [fileName, createdDate] of importChunks.importedTimePairings) {
                createdDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, createdDate);
            }
            await Taggables.updateManyCreatedDates(dbsTransaction, createdDatePairings);
            const lastModifiedDatePairings = new Map();
            for (const [fileName, lastModifiedDate] of importChunks.modifiedTimePairings) {
                lastModifiedDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, lastModifiedDate);
            }
            await Taggables.updateManyLastModifiedDates(dbsTransaction, lastModifiedDatePairings);
            const lastViewedDatePairings = new Map();
            for (const [fileName, lastViewedDate] of importChunks.lastViewedTimePairings) {
                lastViewedDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, lastViewedDate);
            }
            await Taggables.updateManyLastViewedDates(dbsTransaction, lastViewedDatePairings);
            const deletedDatePairings = new Map();
            for (const [fileName, deletedDate] of importChunks.deletedTimePairings) {
                deletedDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, deletedDate);
            }
            await Taggables.updateManyDeletedDates(dbsTransaction, deletedDatePairings);

            /** @type {PreInsertLocalTag[]} */
            const allTags = [];
            /** @type {Set<string>} */
            const allNamespacesSet = new Set();
            for (const tags of importChunks.tagPairings.values()) {
                for (const tag of tags) {
                    allTags.push(tag);
                    for (const namespace of tag.Namespace_Names ?? []) {
                        allNamespacesSet.add(namespace);
                    }
                }
            }
            // upsert namespaces
            const dbNamespacesMap = new Map((await Namespaces.upsertMany(dbsTransaction, [...allNamespacesSet])).map(dbNamespace => [dbNamespace.Namespace_Name, dbNamespace]));
            // upsert tags
            const dbLocalTagsMap = new Map((await LocalTags.upsertMany(dbsTransaction, allTags, localTagServiceID)).map(dbTag => [dbTag.Local_Tags_PK_Hash, dbTag]));
            /** @type {Map<bigint, bigint[]>} */
            const taggablePairings = new Map();
            for (const fileName of importChunks.filePairings.keys()) {
                const taggableId = dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID;
                if (taggableId === undefined) {
                    throw taggableId;
                }
                taggablePairings.set(taggableId, []);
            }

            // update tags namespaces
            /** @type {Map<bigint, Set<number>>} */
            const tagsNamespaces = new Map();
            for (const tags of importChunks.tagPairings.values()) {
                for (const tag of tags) {
                    const dbTag = dbLocalTagsMap.get(localTagsPKHash(tag.Lookup_Name, tag.Source_Name));
                    if (tag.Namespace_Names !== undefined && tag.Namespace_Names.length !== 0) {
                        if (tagsNamespaces.get(dbTag.Tag_ID) === undefined) {
                            tagsNamespaces.set(dbTag.Tag_ID, new Set());
                        }
                        const tagNamespaces = tagsNamespaces.get(dbTag.Tag_ID)
                        for (const namespace of tag.Namespace_Names) {
                            tagNamespaces.add(dbNamespacesMap.get(namespace).Namespace_ID);
                        }
                    }
                }
            }

            await TagsNamespaces.upsertMany(dbsTransaction, tagsNamespaces);

            // assign all normal tags
            for (const [fileName, tags] of importChunks.tagPairings.entries()) {
                taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(...tags.map(tag => dbLocalTagsMap.get(localTagsPKHash(tag.Lookup_Name, tag.Source_Name)).Tag_ID));
            }

            await Tags.upsertMappedToTaggables(dbsTransaction, PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
            await dbEndTransaction(dbsTransaction);
            await finalizeFileMove();
        }

        const CHUNK_SIZE = 100;

        let entriesHandled = 0;
        for (const [fileName, fileInfoEntry] of fileInfos.entries()) {
            ++entriesHandled;
            if (fileInfoEntry['fileLocation'] === undefined) {
                continue;
            }

            ++importChunks.length;

            importChunks.filePairings.set(fileName, {
                File_Hash: sha256(await readFile(fileInfoEntry['fileLocation'])),
                Taggable_Name: fileName,
                File_Extension: normalizeFileExtension(path.extname(fileName)),
                sourceLocation: fileInfoEntry['fileLocation']
            });

            /** @type {ReturnType<typeof importChunks.tagPairings.get>} */
            if (fileInfoEntry['urls'] !== undefined) {
                const urlObjects = [];
                for (const url of (await readFile(fileInfoEntry['urls'])).toString().split('\n')) {
                    urlObjects.push({
                        URL: url,
                        URL_Association: "Imported from hydrus"
                    });
                }
                importChunks.urlPairings.set(fileName, urlObjects);
            }

            if (fileInfoEntry['notes'] !== undefined) {
                const noteObjects = [];
                for (const note of (await readFile(fileInfoEntry['notes'])).toString().split('\n')) {
                    noteObjects.push({
                        Note: note,
                        Note_Association: "Imported from hydrus"
                    });
                }
                importChunks.notePairings.set(fileName, noteObjects);
            }

            const fileTags = [];
            if (fileInfoEntry['tags'] !== undefined) {
                for (const tag of (await readFile(fileInfoEntry['tags'])).toString().split('\n')) {
                    const firstColon = tag.indexOf(":")
                    if (firstColon === -1 || firstColon === 0) {
                        fileTags.push(normalPreInsertLocalTag(tag, "Imported from hydrus"));
                    } else {
                        fileTags.push({
                            ...normalPreInsertLocalTag(tag.slice(firstColon + 1), "Imported from hydrus"),
                            Namespace_Names: [tag.slice(0, firstColon)]
                        });
                    }
                }
            }
            if (fileInfoEntry['modtime'] !== undefined) {
                importChunks.modifiedTimePairings.set(fileName, parseInt((await readFile(fileInfoEntry['modtime'])).toString()));
            }
            if (fileInfoEntry['imptime'] !== undefined) {
                importChunks.importedTimePairings.set(fileName, parseInt((await readFile(fileInfoEntry['imptime'])).toString()));
            }
            if (fileInfoEntry['deltime'] !== undefined) {
                importChunks.deletedTimePairings.set(fileName, parseInt((await readFile(fileInfoEntry['deltime'])).toString()));
            }
            if (fileInfoEntry['lavtime'] !== undefined) {
                importChunks.lastViewedTimePairings.set(fileName, parseInt((await readFile(fileInfoEntry['lavtime'])).toString()));
            }
            importChunks.tagPairings.set(fileName, fileTags);
            if (importChunks.length > CHUNK_SIZE) {
                yield {upcomingSubtasks: entriesHandled};
                entriesHandled = 0;
                await insertImportChunks();
                importChunks = newImportChunks();
            }
        }

        yield {upcomingSubtasks: entriesHandled};
        entriesHandled = 0;
        await insertImportChunks();
        importChunks = newImportChunks();

        console.log("Finished importing from hydrus");
    });
}