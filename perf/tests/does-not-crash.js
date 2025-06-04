import { getPairingsFromStrPairings, getStrPairingsFromPairings, TEST_DEFAULT_PERF_TAGS_ARGS } from "./helpers.js";
import PerfTags from "../../src/perf-tags-binding/perf-tags.js"
import { existsSync } from "fs";
/** @import {TestFunction} from "./helpers.js" */


/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    "exit": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const ok = await perfTags.close();

        if (!ok) {
            throw `Test case failed, no OK! returned from close`;
        }
    },
    "bad_command": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        perfTags.__writeToStdin("exiT\r\n");
        const badcmdd = await perfTags.__dataOrTimeout("BAD COMMAND!\r\n", 100);

        if (!badcmdd) {
            throw `Test case failed, no BAD COMMAND! returned from exiT`;
        }
    },
    "tag_pairings_without_parents_fails": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        perfTags.__expectError();
        const ok = await perfTags.insertTagPairings(getPairingsFromStrPairings({'tag00001': ['file0001']}));

        if (ok) {
            throw `Test case failed, no error on insert_tag_pairings without parents`;
        }
    },
    "insert_tag_pairings_without_file_parents": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['file0001']});
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));

        perfTags.__expectError();
        const ok = await perfTags.insertTagPairings(tagPairings);

        if (ok) {
            throw `Test case failed, no error on insert_tag_pairings without file parents`;
        }
    },
    "insert_tag_pairings_without_tag_parents": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['file0001']});
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        perfTags.__expectError();
        const ok = await perfTags.insertTagPairings(tagPairings);

        if (ok) {
            throw `Test case failed, no error on insert_tag_pairings without tag parents`;
        }
    },
    "insert_tag_pairings": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['file0001']});
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        const ok = await perfTags.insertTagPairings(tagPairings);

        if (!ok) {
            throw `Test case failed, no OK! on insertion of tag pairings with parents both inserted`;
        }
    },
    "uses_specified_input_locations": async(createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", "test-dir/iodir/perf-input.txt", "test-dir/iodir/perf-output.txt", "test-dir/database-dir/perftag-dir");
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['file0001']});
        await perfTags.insertFiles(PerfTags.getFilesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", "test-dir/iodir/perf-input.txt", "test-dir/iodir/perf-output.txt", "test-dir/database-dir/perftag-dir");
        const {filePairings} = await perfTags.readFilesTags(PerfTags.getFilesFromTagPairings(tagPairings));
        const strFileTags = getStrPairingsFromPairings(filePairings);
        if (strFileTags['file0001'] === undefined || strFileTags['file0001'].length !== 1 || strFileTags['file0001'][0] !== "tag00001") {
            throw "Test case failed, file tags not found after writing";
        }

        if (!existsSync("test-dir/iodir/perf-input.txt") || !existsSync("test-dir/iodir/perf-output.txt") || !existsSync("test-dir/database-dir/perftag-dir")) {
            throw "Test case failed, one of the specified input locations was not found";
        }
    }
};
export default TESTS;