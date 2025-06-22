import { getPairingsFromStrPairings, getStrPairingsFromPairings, TEST_DEFAULT_PERF_EXE, TEST_DEFAULT_PERF_TAGS_ARGS } from "./helpers.js";
import PerfTags from "../../src/perf-tags-binding/perf-tags.js"
import { existsSync } from "fs";
/** @import {TestFunction} from "./helpers.js" */


/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    "exit": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const ok = await perfTags.close();

        if (!ok) {
            throw `Test case failed, no OK! returned from close`;
        }
    },
    "bad_command": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        perfTags.__writeToStdin(`exiT${PerfTags.NEWLINE}`);
        const badcmdd = await perfTags.__dataOrTimeout(`BAD COMMAND!${PerfTags.NEWLINE}`, 100);

        if (!badcmdd) {
            throw `Test case failed, no BAD COMMAND! returned from exiT`;
        }
    },
    "insert_tag_pairings_without_parents_fails": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        perfTags.__expectError();
        const ok = await perfTags.__insertTagPairings(getPairingsFromStrPairings({'tag00001': ['tgbl0001']}));

        if (ok) {
            throw `Test case failed, no error on insert_tag_pairings without parents`;
        }
    },
    "insert_tag_pairings_without_file_parents": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['tgbl0001']});
        await perfTags.insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));

        perfTags.__expectError();
        const ok = await perfTags.__insertTagPairings(tagPairings);

        if (ok) {
            throw `Test case failed, no error on insert_tag_pairings without file parents`;
        }
    },
    "insert_tag_pairings_without_tag_parents": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['tgbl0001']});
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        perfTags.__expectError();
        const ok = await perfTags.__insertTagPairings(tagPairings);

        if (ok) {
            throw `Test case failed, no error on insert_tag_pairings without tag parents`;
        }
    },
    "insert_tag_pairings": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings({'tag00001': ['tgbl0001']});
        const ok = await perfTags.insertTagPairings(tagPairings);

        if (!ok) {
            throw `Test case failed, no OK! on insertion of tag pairings with parents both inserted`;
        }
    },
    "uses_specified_input_locations": async(createPerfTags) => {
        const NEW_ARGS = [...TEST_DEFAULT_PERF_TAGS_ARGS].map((v, i) => {
            if (i === 0) {
                return v;
            }
            return `test-dir/newdir/${v.slice("test-dir/".length)}`;
        })
        let perfTags = createPerfTags(...NEW_ARGS);
        await perfTags.insertTaggables([1n]);
        await perfTags.insertTags([1n]);
        await perfTags.insertTagPairings(new Map([[1n, [1n]]]));
        await perfTags.close();
        perfTags = createPerfTags(...NEW_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags([1n]);
        if (taggablePairings.get(1n) === undefined || taggablePairings.get(1n).length !== 1 || taggablePairings.get(1n)[0] !== 1n) {
            throw "Test case failed, file tags not found after writing";
        }

        // write input, read input, read output, database dir, and archive dir
        if (!existsSync(NEW_ARGS[1]) || !existsSync(NEW_ARGS[3]) || !existsSync(NEW_ARGS[4]) || !existsSync(NEW_ARGS[5]) || !existsSync(NEW_ARGS[6])) {
            throw "Test case failed, one of the specified input locations was not found";
        }
    },
    "0x1A_input_does_not_fail": async(createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        // will fail here if 0x1A (SUB) input gets read wrong
        let files = [0x1An];
        await perfTags.insertTaggables(files);
        await perfTags.close();
    },
    "carriage_return_input_does_not_save_newline": async(createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        let files = [BigInt('\r'.charCodeAt(0))];
        await perfTags.insertTaggables(files);
        await perfTags.close();
        // will fail here if \n input gets saved wrong
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.close();
    },
    "newline_input_does_not_save_carriage_return": async(createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        let files = [BigInt('\n'.charCodeAt(0))];
        await perfTags.insertTaggables(files);
        await perfTags.close();
        // will fail here if \n input gets saved wrong
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.close();
    },
    "search_will_not_crash_with_nonexistent_tag": async(createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.search(PerfTags.searchTag(5n));
    },
    "complement_should_correctly_flush_to_cache_file": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        // make taggable with excessively overloaded tags to make it complement
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n]]])));
        // force flush to go from write ahead file which has no complements to db file
        await perfTags.__flushAndPurgeUnusedFiles();

        // reopen perfTags
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTags([11n, 12n, 13n]);
        // read tags should not fail
        await perfTags.readTaggablesTags([1n]);
    },
    "erasing_non_existent_tag_pairings_should_not_crash": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.deleteTagPairings(new Map([[1n, [1n,2n,3n,4n]]]));
    }
};
export default TESTS;