import path from "path";
import { extractWith7Z, getAllFileEntries, sha256 } from "../util.js";
import { dbBeginTransaction, dbEndTransaction } from "./db-util.js";
import { readFileSync } from "fs";
import { addTagsToTaggables, normalizeFileExtension, updateTagsNamespaces, upsertFileExtensions, upsertLocalTags, upsertNamespaces, upsertURLAssociations, upsertURLs, urlAssociationPKHash } from "./tags.js";
import { HAS_NOTES_TAG, HAS_URL_TAG, IS_FILE_TAG, normalPreInsertLocalTag, localTagsPKHash } from "../client/js/tags.js";
import { updateTaggablesCreatedDate, updateTaggablesDeletedDate, updateTaggablesLastModifiedDate, updateTaggablesLastViewedDate, upsertLocalFiles } from "./taggables.js";
import { addNotesToTaggables } from "./notes.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";
/**
 * @import {Databases} from "./db-util.js"
 * @import {PreInsertLocalTag, DBFileExtension, DBLocalTagService} from "./tags.js"
 * @import {PreInsertLocalFile, DBLocalTaggableService} from "./taggables.js"
 * @import {PreInsertNote} from "./notes.js"
 */

/**
 * 
 * @param {Databases} dbs
 * @param {string} partialUploadFolder
 * @param {string[]} partialFilePaths
 * @param {DBLocalTagService} dbLocalTagService
 * @param {DBLocalTaggableService} dbLocalTaggableService
 */
export async function importFilesFromHydrus(dbs, partialUploadFolder, partialFilePaths, dbLocalTagService, dbLocalTaggableService) {
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

    const newImportChunks = () => {
        return {
            length: 0,
            /** @type {Map<string, Omit<PreInsertLocalFile, keyof DBFileExtension> & {File_Extension: string}} */
            filePairings: new Map(),
            /** @type {Map<string, {URL: string, URL_Association: string}[]} */
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

    
    const insertImportChunks = async () => {
        await dbBeginTransaction(dbs);
        const allUrls = [];
        
        for (const urls of importChunks.urlPairings.values()) {
            for (const url of urls) {
                allUrls.push(url);
            }
        }
        
        // insert all urls
        const dbURLMap = new Map((await upsertURLs(dbs, allUrls.map(url => url.URL))).map(dbURL => [dbURL.URL, dbURL]));
        const dbURLAssociationMap = new Map((await upsertURLAssociations(dbs, allUrls.map(url => ({
            ...dbURLMap.get(url.URL),
            URL_Association: url.URL_Association
        })))).map(dbUrlAssociation => [dbUrlAssociation.URL_Associations_PK_Hash, dbUrlAssociation]));

        // insert file extensions
        const fileExtensionsSet = new Set();
        for (const value of importChunks.filePairings.values()) {
            fileExtensionsSet.add(value.File_Extension);
        }

        const fileExtensionMap = new Map((await upsertFileExtensions(dbs, [...fileExtensionsSet])).map(dbFileExtension => [dbFileExtension.File_Extension, dbFileExtension]));

        // insert file info
        /** @type {PreInsertLocalFile[]} */
        const localFiles = [];
        for (const file of importChunks.filePairings.values()) {
            localFiles.push({
                ...file,
                ...fileExtensionMap.get(file.File_Extension)
            });
        }

        const {dbLocalFiles, finalizeFileMove} = await upsertLocalFiles(dbs, localFiles, dbLocalTaggableService);
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
        addNotesToTaggables(dbs, notePairings);

        // insert dates
        const createdDatePairings = new Map();
        for (const [fileName, createdDate] of importChunks.importedTimePairings) {
            createdDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, createdDate);
        }
        await updateTaggablesCreatedDate(dbs, createdDatePairings);
        const lastModifiedDatePairings = new Map();
        for (const [fileName, lastModifiedDate] of importChunks.modifiedTimePairings) {
            lastModifiedDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, lastModifiedDate);
        }
        await updateTaggablesLastModifiedDate(dbs, lastModifiedDatePairings);
        const lastViewedDatePairings = new Map();
        for (const [fileName, lastViewedDate] of importChunks.lastViewedTimePairings) {
            lastViewedDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, lastViewedDate);
        }
        await updateTaggablesLastViewedDate(dbs, lastViewedDatePairings);
        const deletedDatePairings = new Map();
        for (const [fileName, deletedDate] of importChunks.deletedTimePairings) {
            deletedDatePairings.set(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID, deletedDate);
        }
        await updateTaggablesDeletedDate(dbs, deletedDatePairings);

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
        const dbNamespacesMap = new Map((await upsertNamespaces(dbs, [...allNamespacesSet])).map(dbNamespace => [dbNamespace.Namespace_Name, dbNamespace]));

        // upsert tags
        const dbLocalTagsMap = new Map((await upsertLocalTags(dbs, allTags, dbLocalTagService.Local_Tag_Service_ID)).map(dbTag => [dbTag.Local_Tags_PK_Hash, dbTag]));

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

        await updateTagsNamespaces(dbs, tagsNamespaces);
        
        // assign all system tag pairings
        for (const [fileName, file] of importChunks.filePairings.entries()) {
            taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(IS_FILE_TAG.Tag_ID);
            taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(fileExtensionMap.get(file.File_Extension).Has_File_Extension_Tag_ID);
        }
        for (const dbLocalFile of dbLocalFilesMap.values()) {
            taggablePairings.get(dbLocalFile.Taggable_ID).push(dbLocalFile.Has_File_Hash_Tag_ID);
        }
        for (const [fileName, urls] of importChunks.urlPairings.entries()) {
            if (urls.length !== 0) {
                taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(HAS_URL_TAG.Tag_ID);
            }
            for (const url of urls) {
                const dbURL = {
                    ...dbURLMap.get(url.URL),
                    URL_Association: url.URL_Association
                };
                const dbURLAssociation = dbURLAssociationMap.get(urlAssociationPKHash(dbURL).toString());
                taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(dbURLAssociation.Has_URL_Tag_ID);
                taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(dbURLAssociation.Has_URL_With_Association_Tag_ID);
            }
        }
        for (const [fileName, notes] of importChunks.notePairings.entries()) {
            if (notes.length !== 0) {
                taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(HAS_NOTES_TAG.Tag_ID);
            }
        }

        // assign all normal tags
        for (const [fileName, tags] of importChunks.tagPairings.entries()) {
            taggablePairings.get(dbLocalFilesMap.get(dbFileHashMap.get(fileName)).Taggable_ID).push(...tags.map(tag => dbLocalTagsMap.get(localTagsPKHash(tag.Lookup_Name, tag.Source_Name)).Tag_ID));
        }

        await addTagsToTaggables(dbs, PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
        await dbEndTransaction(dbs);
        await finalizeFileMove();
        await dbs.perfTags.reopen();
    }

    for (const [fileName, fileInfoEntry] of fileInfos.entries()) {
        if (fileInfoEntry['fileLocation'] === undefined) {
            continue;
        }
        ++importChunks.length;

        importChunks.filePairings.set(fileName, {
            File_Hash: sha256(readFileSync(fileInfoEntry['fileLocation'])),
            Taggable_Name: fileName,
            File_Extension: normalizeFileExtension(path.extname(fileName)),
            sourceLocation: fileInfoEntry['fileLocation']
        });

        /** @type {ReturnType<typeof importChunks.tagPairings.get>} */
        if (fileInfoEntry['urls'] !== undefined) {
            const urlObjects = [];
            for (const url of readFileSync(fileInfoEntry['urls']).toString().split('\n')) {
                urlObjects.push({
                    URL: url,
                    URL_Association: "Imported from hydrus"
                });
            }
            importChunks.urlPairings.set(fileName, urlObjects);
        }

        if (fileInfoEntry['notes'] !== undefined) {
            const noteObjects = [];
            for (const note of readFileSync(fileInfoEntry['notes']).toString().split('\n')) {
                noteObjects.push({
                    Note: note,
                    Note_Association: "Imported from hydrus"
                });
            }
            importChunks.notePairings.set(fileName, noteObjects);
        }

        const fileTags = [];
        if (fileInfoEntry['tags'] !== undefined) {
            for (const tag of readFileSync(fileInfoEntry['tags']).toString().split('\n')) {
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
            importChunks.modifiedTimePairings.set(fileName, parseInt(readFileSync(fileInfoEntry['modtime']).toString()));
        }
        if (fileInfoEntry['imptime'] !== undefined) {
            importChunks.importedTimePairings.set(fileName, parseInt(readFileSync(fileInfoEntry['imptime']).toString()));
        }
        if (fileInfoEntry['deltime'] !== undefined) {
            importChunks.deletedTimePairings.set(fileName, parseInt(readFileSync(fileInfoEntry['deltime']).toString()));
        }
        if (fileInfoEntry['lavtime'] !== undefined) {
            importChunks.lastViewedTimePairings.set(fileName, parseInt(readFileSync(fileInfoEntry['lavtime']).toString()));
        }
        importChunks.tagPairings.set(fileName, fileTags);
        if (importChunks.length > 500) {
            await insertImportChunks();
            importChunks = newImportChunks();
        }
    }

    await insertImportChunks();
    importChunks = newImportChunks();

    console.log("Finished importing from hydrus");
}