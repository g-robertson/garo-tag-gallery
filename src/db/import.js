import path from "path";
import { extractWith7Z, getAllFileEntries, sha256 } from "../util.js";
import { dbBeginTransaction, dbEndTransaction } from "./db-util.js";
import { LocalTags, Namespaces, TagsNamespaces, Tags, LocalTagServices } from "./tags.js";
import { localTagsPKHash } from "../client/js/tags.js";
import { Files, LocalFiles, LocalTaggableServices, Taggables } from "./taggables.js";
import { addNotesToTaggables } from "./notes.js";
import PerfTags from "../perf-tags-binding/perf-tags.js";
import { Job } from "./job-manager.js";
import { readFile } from "fs/promises";
import { z } from "zod";
import { mapNullCoalesce } from "../client/js/client-util.js";
import { AppliedMetrics, appliedMetricsPKHash, LocalMetrics, LocalMetricServices } from "./metrics.js";
import { METRIC_TYPES } from "../client/js/metrics.js";
/**
 * @import {Databases} from "./db-util.js"
 * @import {URLAssociation} from "../client/js/tags.js"
 * @import {PreInsertLocalTag, DBLocalTag, DBJoinedLocalTagService} from "./tags.js"
 * @import {PreInsertLocalFile, DBJoinedLocalFile, TagMappedDBJoinedLocalTaggableService} from "./taggables.js"
 * @import {DBLocalMetric, PreInsertAppliedMetric, TagMappedDBAppliedMetric, DBJoinedLocalMetricService} from "./metrics.js"
 * @import {PreInsertNote} from "./notes.js"
 */

export const IMPORTABLE_TYPES = {
    USER_FACING_LOCAL_FILE: 0,
    LOCAL_TAGGABLE_SERVICE: 1,
    LOCAL_TAG_SERVICE: 2,
    LOCAL_METRIC_SERVICE: 3,
    LOCAL_METRIC: 4,
};

const Z_NOTE = z.strictObject({
    Note: z.string(),
    Note_Association: z.string()
});

const Z_URL_ASSOCIATION = z.strictObject({
    URL: z.string(),
    URL_Association: z.string()
});

const Z_IMPORTABLE_TAG = z.strictObject({
    Lookup_Name: z.string(),
    Source_Name: z.string(),
    Display_Name: z.string(),
    Namespaces: z.array(z.string()),
    Local_Tag_Service_ID: z.number()
});

const Z_IMPORTABLE_METRIC = z.strictObject({
    Local_Metric_ID: z.number(),
    User_ID: z.number(),
    Applied_Value: z.number()
});

const Z_IMPORTABLE = z.strictObject({
    File_Hash: z.instanceof(Buffer),
    Source_Location: z.optional(z.string().or(z.literal(Files.IN_DATABASE_SOURCE_LOCATION))),
    Local_Taggable_Service_Tag_ID: z.bigint(),
    File_Extension: z.nullable(z.optional(z.string())),
    Taggable_Name: z.nullable(z.optional(z.string())),
    Taggable_Created_Date: z.nullable(z.optional(z.number())),
    Taggable_Deleted_Date: z.nullable(z.optional(z.number())),
    Taggable_Last_Modified_Date: z.nullable(z.optional(z.number())),
    Taggable_Last_Viewed_Date: z.nullable(z.optional(z.number())),
    URL_Associations: z.array(Z_URL_ASSOCIATION),
    Tags: z.array(Z_IMPORTABLE_TAG),
    Metrics: z.array(Z_IMPORTABLE_METRIC),
    Notes: z.array(Z_NOTE)
});

/** @typedef {z.infer<typeof Z_IMPORTABLE} Importable */

/**
 * @param {Databases} dbs
 * @param {Importable} importable 
 */
export async function validateImportable(dbs, importable) {
    if (typeof importable.Source_Location === "string" && importable.File_Hash === undefined) {
        importable.File_Hash = sha256(await readFile(Files.getTrueSourceLocation(dbs, importable.Source_Location, importable.File_Hash, importable.File_Extension)));
    }
    
    importable.Metrics ??= [];
    importable.Notes ??= [];

    return Z_IMPORTABLE.parse(importable);
}

/**
 * @param {Databases} dbs 
 * @param {Importable[]} importables 
 */
export async function importChunks(dbs, importables) {
    if (importables.length === 0) {
        return;
    }

    for (let i = 0; i < importables.length; ++i) {
        importables[i] = await validateImportable(dbs, importables[i]);
    }
    dbs = await dbBeginTransaction(dbs);

    /** @type {Map<number, (PreInsertLocalTag & {Namespaces: string[]})[]>} */
    const localTagServiceToAllTags = new Map();
    /** @type {Map<bigint, PreInsertLocalFile[]>} */
    const localTaggableServiceToPreInsertLocalFiles = new Map();
    /** @type {PreInsertAppliedMetric[]} */
    const allPreInsertAppliedMetrics = [];
    for (const importable of importables) {
        if (importable.Source_Location !== undefined) {
            const localTaggableServicePreInsertLocalFiles = mapNullCoalesce(localTaggableServiceToPreInsertLocalFiles, importable.Local_Taggable_Service_Tag_ID, []);
            localTaggableServicePreInsertLocalFiles.push({
                File_Hash: importable.File_Hash,
                File_Extension: importable.File_Extension,
                Taggable_Name: importable.Taggable_Name ?? importable.File_Hash.toString("hex"),
                sourceLocation: importable.Source_Location
            });
        }

        for (const tag of importable.Tags) {
            const localTagServiceTags = mapNullCoalesce(localTagServiceToAllTags, tag.Local_Tag_Service_ID, []);
            localTagServiceTags.push({
                Display_Name: tag.Display_Name,
                Lookup_Name: tag.Lookup_Name,
                Source_Name: tag.Source_Name,
                Namespaces: tag.Namespaces ?? []
            });
        }

        for (const metric of importable.Metrics) {
            allPreInsertAppliedMetrics.push(metric);
        }
    }

    // upsert file info
    /** @type {Map<string, DBJoinedLocalFile>} */
    const dbLocalFilesMap = new Map();
    /** @type {(() => Promise<void>)[]} */
    const finalizeFileMoves = [];
    for (const [localTaggableServiceTagID, preInsertLocalFiles] of localTaggableServiceToPreInsertLocalFiles) {
        const {dbLocalFiles, finalizeFileMove} = await LocalFiles.upsertMany(dbs, preInsertLocalFiles, localTaggableServiceTagID);
        finalizeFileMoves.push(finalizeFileMove);
        for (const dbLocalFile of dbLocalFiles) {
            dbLocalFilesMap.set(dbLocalFile.File_Hash.toString("hex"), dbLocalFile);
        }
    }
    
    // upsert tags
    /** @type {Map<number, Map<string, DBLocalTag>>} */
    const dbLocalTagsMap = new Map();
    // upsert tags namespaces
    /** @type {Map<bigint, Set<string>>} */
    const tagsNamespaces = new Map();
    for (const [localTagServiceID, allTags] of localTagServiceToAllTags) {
        const dbLocalTagServiceLocalTagsMap = new Map((await LocalTags.upsertMany(dbs, allTags, localTagServiceID)).map(dbTag => [dbTag.Local_Tags_PK_Hash, dbTag]));
        dbLocalTagsMap.set(localTagServiceID, dbLocalTagServiceLocalTagsMap);
        for (const tag of allTags) {
            const dbTag = dbLocalTagServiceLocalTagsMap.get(localTagsPKHash(tag.Lookup_Name, tag.Source_Name));
            tagsNamespaces.set(dbTag.Tag_ID, new Set(tag.Namespaces));
        }
    }
    await TagsNamespaces.upsertMany(dbs, tagsNamespaces);

    // upsert applied metrics
    const appliedMetricsMap = new Map((await AppliedMetrics.tagMapped(dbs, await AppliedMetrics.upsertMany(dbs, allPreInsertAppliedMetrics))).map(appliedMetric => [
        appliedMetric.Local_Applied_Metric_PK_Hash,
        appliedMetric
    ]));
    
    // insert notes
    /** @type {Map<bigint, PreInsertNote[]>} */
    const notePairings = new Map();
    // upsert urls to taggables
    /** @type {Map<bigint, URLAssociation[]>} */
    const taggableURLAssociationPairings = new Map();
    // insert dates
    /** @type {Map<bigint, number>} */
    const createdDatePairings = new Map();
    /** @type {Map<bigint, number>} */
    const lastModifiedDatePairings = new Map();
    /** @type {Map<bigint, number>} */
    const lastViewedDatePairings = new Map();
    /** @type {Map<bigint, number>} */
    const deletedDatePairings = new Map();
    // upsert tags to taggables
    /** @type {Map<bigint, bigint[]>} */
    const taggablePairings = new Map();
    // upsert metrics to taggables
    /** @type {Map<bigint, TagMappedDBAppliedMetric[]>} */
    const taggableMetricPairings = new Map();
    for (const importable of importables) {
        const importableTaggableID = dbLocalFilesMap.get(importable.File_Hash.toString("hex")).Taggable_ID;
        notePairings.set(importableTaggableID, importable.Notes);
        taggableURLAssociationPairings.set(importableTaggableID, importable.URL_Associations);
        createdDatePairings.set(importableTaggableID, importable.Taggable_Created_Date);
        lastModifiedDatePairings.set(importableTaggableID, importable.Taggable_Last_Modified_Date);
        lastViewedDatePairings.set(importableTaggableID, importable.Taggable_Last_Viewed_Date);
        deletedDatePairings.set(importableTaggableID, importable.Taggable_Deleted_Date);
        taggablePairings.set(importableTaggableID, importable.Tags.map(tag => dbLocalTagsMap.get(tag.Local_Tag_Service_ID).get(localTagsPKHash(tag.Lookup_Name, tag.Source_Name)).Tag_ID));
        taggableMetricPairings.set(importableTaggableID, importable.Metrics.map(metric => appliedMetricsMap.get(appliedMetricsPKHash(metric))));
    }

    await addNotesToTaggables(dbs, notePairings);
    await Taggables.upsertURLAssociations(dbs, taggableURLAssociationPairings);
    await Taggables.updateManyCreatedDates(dbs, createdDatePairings);
    await Taggables.updateManyLastModifiedDates(dbs, lastModifiedDatePairings);
    await Taggables.updateManyLastViewedDates(dbs, lastViewedDatePairings);
    await Taggables.updateManyDeletedDates(dbs, deletedDatePairings);
    await Tags.upsertTagPairingsToTaggables(dbs, PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
    await AppliedMetrics.applyManyMappedToTaggables(dbs, taggableMetricPairings);
    for (const finalizeFileMove of finalizeFileMoves) {
        await finalizeFileMove();
    }
    await dbEndTransaction(dbs);
}

/**
 * @param {Databases} dbs
 * @param {string} partialUploadFolder
 * @param {string[]} partialFilePaths
 * @param {number} localTagServiceID
 * @param {number} localTaggableServiceID
 */
export function importFilesFromHydrusJob(dbs, partialUploadFolder, partialFilePaths, localTagServiceID, localTaggableServiceID) {
    return new Job({durationBetweenTasks: 250, jobName: "Importing files from Hydrus"}, async function*() {
        yield {upcomingSubtasks: 1, upcomingTaskName: "Extracting ZIP file"};

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
    
        yield {upcomingSubtasks: 1, upcomingTaskName: "Reading extracted ZIP file"};
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
                    const fileInfo = mapNullCoalesce(fileInfos, taggableFileName, {});
                    fileInfo[extensionName] = fileEntry;
                    isSidecar = true;
                    break;
                }
            }


            if (!isSidecar) {
                const fileInfo = mapNullCoalesce(fileInfos, baseName, {});
                if (fileInfo.fileLocation) { throw "two files with same basename"; }
                fileInfo.fileLocation = fileEntry;
            }
        }

        yield {remainingSubtasks: fileInfos.size};

        const inLocalTaggableServiceTagID = (await LocalTaggableServices.selectTagMapping(dbs, localTaggableServiceID)).Tag_ID;

        const CHUNK_SIZE = 100;

        /** @type {Importable[]} */
        let importables = [];

        let entriesHandled = 0;
        for (const [fileName, fileInfoEntry] of fileInfos.entries()) {
            ++entriesHandled;
            if (fileInfoEntry['fileLocation'] === undefined) {
                continue;
            }

            /** @type {Importable} */
            const importable = {};

            importable.Taggable_Name = fileName;
            importable.Local_Taggable_Service_Tag_ID = inLocalTaggableServiceTagID;
            importable.File_Extension = path.extname(fileName);
            importable.Source_Location = fileInfoEntry['fileLocation'];
            importable.URL_Associations = [];

            /** @type {ReturnType<typeof importChunks.tagPairings.get>} */
            if (fileInfoEntry['urls'] !== undefined) {
                /** @type {URLAssociation[]} */
                for (let url of (await readFile(fileInfoEntry['urls'])).toString().split('\n')) {
                    url = url.trim();
                    importable.URL_Associations.push({
                        URL: url,
                        URL_Association: "Imported from hydrus"
                    });
                }
            }

            importable.Notes = [];
            if (fileInfoEntry['notes'] !== undefined) {
                for (let note of (await readFile(fileInfoEntry['notes'])).toString().split('\n')) {
                    note = note.trim();
                    importable.Notes.push({
                        Note: note,
                        Note_Association: "Imported from hydrus"
                    });
                }
            }

            importable.Tags = [];
            if (fileInfoEntry['tags'] !== undefined) {
                for (let tag of (await readFile(fileInfoEntry['tags'])).toString().split('\n')) {
                    tag = tag.trim();
                    const firstColon = tag.indexOf(":")
                    if (firstColon === -1 || firstColon === 0) {
                        importable.Tags.push({
                            Local_Tag_Service_ID: localTagServiceID,
                            Display_Name: tag,
                            Lookup_Name: tag,
                            Source_Name: "Imported from hydrus",
                            Namespaces: []
                        });
                    } else {
                        importable.Tags.push({
                            Local_Tag_Service_ID: localTagServiceID,
                            Display_Name: tag.slice(firstColon + 1),
                            Lookup_Name: tag.slice(firstColon + 1),
                            Source_Name: "Imported from hydrus",
                            Namespaces: [tag.slice(0, firstColon)]
                        });
                    }
                }
            }
            if (fileInfoEntry['modtime'] !== undefined) {
                importable.Taggable_Last_Modified_Date = parseInt((await readFile(fileInfoEntry['modtime'])).toString());
            }
            if (fileInfoEntry['imptime'] !== undefined) {
                importable.Taggable_Created_Date = parseInt((await readFile(fileInfoEntry['imptime'])).toString());
            }
            if (fileInfoEntry['deltime'] !== undefined) {
                importable.Taggable_Deleted_Date = parseInt((await readFile(fileInfoEntry['deltime'])).toString());
            }
            if (fileInfoEntry['lavtime'] !== undefined) {
                importable.Taggable_Last_Viewed_Date = parseInt((await readFile(fileInfoEntry['lavtime'])).toString());
            }

            importables.push(importable);

            if (importables.length >= CHUNK_SIZE) {
                yield {upcomingSubtasks: entriesHandled, upcomingTaskName: `Importing ${importables.length} files`};
                entriesHandled = 0;
                await importChunks(dbs, importables);
                importables = [];
            }
        }

        if (entriesHandled > 0) {
            yield {upcomingSubtasks: entriesHandled, upcomingTaskName: `Importing ${importables.length} files`};
            entriesHandled = 0;
            await importChunks(dbs, importables);
        }

        console.log("Finished importing from hydrus");
    });
}

/**
 * @param {Databases} dbs 
 * @param {any[]} backupMappings
 * @param {number} userID
 */
export function importMappingsFromBackupJob(dbs, backupMappings, userID) {
    return new Job({durationBetweenTasks: 250, jobName: "Importing mappings from backup"}, async function*() {
        yield {remainingSubtasks: backupMappings.length};

        /** @type {Importable[]} */
        let importables = []

        /** @type {Map<number, DBJoinedLocalTagService>} */
        const tagServiceIDToTagService = new Map();
        /** @type {Map<number, TagMappedDBJoinedLocalTaggableService>} */
        const taggableServiceIDToTaggableService = new Map();
        /** @type {Map<number, DBJoinedLocalMetricService>} */
        const metricServiceIDToMetricService = new Map();
        /** @type {Map<number, DBLocalMetric>} */
        const metricIDToMetric = new Map();

        for (const backupItem of backupMappings) {
            if (backupItem.Type === IMPORTABLE_TYPES.LOCAL_TAGGABLE_SERVICE) {
                yield {upcomingSubtasks: 1, upcomingTaskName: `Inserting local taggable service: ${backupItem.Service_Name}`};
                const localTaggableServiceID = await LocalTaggableServices.userInsert(dbs, userID, backupItem.Service_Name);
                taggableServiceIDToTaggableService.set(
                    backupItem.Local_Taggable_Service_ID,
                    await LocalTaggableServices.tagMap(dbs, await LocalTaggableServices.selectByID(dbs, localTaggableServiceID))
                );
            } else if (backupItem.Type === IMPORTABLE_TYPES.LOCAL_TAG_SERVICE) {
                yield {upcomingSubtasks: 1, upcomingTaskName: `Inserting local tag service: ${backupItem.Service_Name}`};
                const localTagServiceID = await LocalTagServices.userInsert(dbs, userID, backupItem.Service_Name);
                tagServiceIDToTagService.set(backupItem.Local_Tag_Service_ID, await LocalTagServices.selectByID(dbs, localTagServiceID));
            } else if (backupItem.Type === IMPORTABLE_TYPES.LOCAL_METRIC_SERVICE) {
                yield {upcomingSubtasks: 1, upcomingTaskName: `Inserting local metric service: ${backupItem.Service_Name}`};
                const localMetricServiceID = await LocalMetricServices.userInsert(dbs, userID, backupItem.Service_Name);
                metricServiceIDToMetricService.set(backupItem.Local_Metric_Service_ID, await LocalMetricServices.selectByID(dbs, localMetricServiceID));
            } else if (backupItem.Type === IMPORTABLE_TYPES.LOCAL_METRIC) {
                yield {upcomingSubtasks: 1, upcomingTaskName: `Inserting local metric: ${backupItem.Local_Metric_Name}`};
                const localMetricID = await LocalMetrics.insert(dbs, {
                    Local_Metric_Name: backupItem.Local_Metric_Name,
                    Local_Metric_Lower_Bound: backupItem.Local_Metric_Lower_Bound,
                    Local_Metric_Upper_Bound: backupItem.Local_Metric_Upper_Bound,
                    Local_Metric_Precision: backupItem.Local_Metric_Precision,
                    Local_Metric_Type: backupItem.Local_Metric_Type
                }, metricServiceIDToMetricService.get(backupItem.Local_Metric_Service_ID).Local_Metric_Service_ID);
                metricIDToMetric.set(backupItem.Local_Metric_ID, await LocalMetrics.selectByID(dbs, localMetricID));
            } else if (backupItem.Type === IMPORTABLE_TYPES.USER_FACING_LOCAL_FILE) {
                /** @type {Importable} */
                const importable = {};
                importable.File_Hash = Buffer.from(backupItem.File_Hash, "hex");
                importable.File_Extension = backupItem.File_Extension;
                importable.Source_Location = Files.IN_DATABASE_SOURCE_LOCATION;
                importable.Taggable_Created_Date = backupItem.Taggable_Created_Date;
                importable.Taggable_Deleted_Date = backupItem.Taggable_Deleted_Date;
                importable.Taggable_Last_Modified_Date = backupItem.Taggable_Last_Modified_Date;
                importable.Taggable_Last_Viewed_Date = backupItem.Taggable_Last_Viewed_Date;
                importable.Local_Taggable_Service_Tag_ID = taggableServiceIDToTaggableService.get(backupItem.Local_Taggable_Service_ID).In_Local_Taggable_Service_Tag.Tag_ID;
                importable.URL_Associations = backupItem.URL_Associations;
                importable.Tags = []
                for (const tag of backupItem.Tags) {
                    importable.Tags.push({
                        Lookup_Name: tag[0],
                        Display_Name: tag[0],
                        Source_Name: tag[2],
                        Namespaces: tag[3],
                        Local_Tag_Service_ID: tagServiceIDToTagService.get(tag[4]).Local_Tag_Service_ID,
                    });
                }
                importable.Metrics = [];
                for (const metric of backupItem.Metrics) {
                    importable.Metrics.push({
                        Local_Metric_ID: metricIDToMetric.get(metric.Local_Metric_ID).Local_Metric_ID,
                        User_ID: userID,
                        Applied_Value: metric.Applied_Value
                    });
                }

                importables.push(importable);
            }

            if (importables.length >= 100) {
                yield {upcomingSubtasks: importables.length, upcomingTaskName: `Importing ${importables.length} local files`};
                await importChunks(dbs, importables);
                importables = [];
            }
        }

        if (importables.length > 0) {
            yield {upcomingSubtasks: importables.length, upcomingTaskName: `Importing ${importables.length} local files`};
            await importChunks(dbs, importables);
            importables = [];
        }
    });
}