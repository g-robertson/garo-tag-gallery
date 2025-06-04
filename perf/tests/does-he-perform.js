import { appendFileSync } from "fs";
import { strFilePairingsToStrTagPairings, getPairingsFromStrPairings, getStrPairingsFromPairings, TEST_DEFAULT_PERF_TAGS_ARGS, getTotalDirectoryBytes } from "./helpers.js";
import PerfTags from "../../src/perf-tags-binding/perf-tags.js"
import { getAllFileEntries } from "../../src/util.js";
/** @import {TestFunction} from "./helpers.js" */


/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    "read_file_tags": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        const {ok, filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00002") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_file_tags_after_exit": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00002") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_file_tags_after_kill": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00002") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 0) {
            throw "File pairings file0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_exit": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 0) {
            throw "File pairings file0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_kill": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 0) {
            throw "File pairings file0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_complex": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings2));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings3));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings2);
        await perfTags.toggleTagPairings(tagPairings3);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1 ||
            strFilePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_exits": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings2));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings3));
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1 ||
            strFilePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_kills": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings2));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings3));
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1 ||
            strFilePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_kills_and_additional_file": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']}));
        const tagPairings4 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0002': ['tag00001','tag00033','tag00052','tag00071']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings4));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings2));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings3));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings4));
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings4);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        let {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        let strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        
        if (strFilePairings['file0001'].indexOf("tag00001") === -1 ||
            strFilePairings['file0001'].indexOf("tag00003") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1 ||
            strFilePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
        
        ({filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings4)));
        strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0002'] === undefined) {
            throw "File pairings does not have file0002";
        }
        if (strFilePairings['file0002'].length !== 4) {
            throw "File pairings file0002 does not have 4 tags";
        }
        if (strFilePairings['file0002'].indexOf("tag00001") === -1 ||
            strFilePairings['file0002'].indexOf("tag00033") === -1 ||
            strFilePairings['file0002'].indexOf("tag00052") === -1 ||
            strFilePairings['file0002'].indexOf("tag00071") === -1) {
            throw "File pairings file0002 lacks one of the placed tags";
        }
    },
    "read_deleted_tag_pairings": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strFilePairingsToStrTagPairings({'file0001': ['tag00001','tag00003']}));
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.deleteTagPairings(tagPairings2);
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFilePairings = getStrPairingsFromPairings(filePairings);
        if (strFilePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (strFilePairings['file0001'].length !== 2) {
            throw "File pairings file0001 does not have 4 tags";
        }
        
        if (strFilePairings['file0001'].indexOf("tag00002") === -1 ||
            strFilePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "complements_make_size_smaller": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const strFilePairings = {};
        let totalFileCount = 200;
        let totalTagCount = 8000;
        for (let i = 0; i < totalFileCount; ++i) {
            const tags = [];
            for (let i = 0; i < totalTagCount; ++i) {
                tags.push(`tag${i.toString().padStart(5, "0")}`);
            }

            const file = `file${i.toString().padStart(4, "0")}`;
            strFilePairings[file] = tags;
        }
        const tagPairings = getPairingsFromStrPairings(strFilePairingsToStrTagPairings(strFilePairings));

        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.__flushAndPurgeUnusedFiles();
        if (await perfTags.close() === false) {
            throw "Perf tags timed out on close";
        }

        // * 2 inside for accounting for tag bucket + tag buckets, file bucket + file buckets storages
        // * 9 inside for 64 bit entries + complement bit
        // * 2 in addition to that as wiggle room
        const MAX_ACCEPTABLE_FILE_SIZE = (9 * (totalFileCount + totalTagCount) * 2) * 2;
        console.log(MAX_ACCEPTABLE_FILE_SIZE);
        const realDirectorySize = getTotalDirectoryBytes("test-dir/database-dir");
        if (realDirectorySize > MAX_ACCEPTABLE_FILE_SIZE) {
            throw `Directory size with only completely dense tags was ${realDirectorySize} bytes > ${MAX_ACCEPTABLE_FILE_SIZE} bytes indicating that complements are not implemented`;
        }
    }
};
export default TESTS;