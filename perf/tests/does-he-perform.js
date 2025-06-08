import { appendFile, appendFileSync } from "fs";
import { strTaggablePairingsToStrTagPairings, getPairingsFromStrPairings, getStrPairingsFromPairings, TEST_DEFAULT_PERF_TAGS_ARGS, getTotalDirectoryBytes } from "./helpers.js";
import PerfTags from "../../src/perf-tags-binding/perf-tags.js"
import { getAllFileEntries } from "../../src/util.js";
/** @import {TestFunction} from "./helpers.js" */


/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    "read_file_tags": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertTagPairings(tagPairings);
        const {ok, taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00002") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "read_file_tags_after_exit": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00002") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "read_file_tags_after_kill": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00002") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "insert_tags between toggle tag pairings should not cause problem": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        await perfTags.insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.__toggleTagPairings(tagPairings);
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.__toggleTagPairings(tagPairings);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 0) {
            throw "Taggable pairings tgbl0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));

        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n) === undefined) {
            throw "Taggable pairings does not have taggable 1";
        }
        if (taggablePairings.get(1n).length !== 0) {
            throw "Taggable pairings taggable 1 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_exit": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));

        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n) === undefined) {
            throw "Taggable pairings does not have taggable 1";
        }
        if (taggablePairings.get(1n).length !== 0) {
            throw "Taggable pairings taggable 1 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_kill": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));

        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n) === undefined) {
            throw "Taggable pairings does not have taggable 1";
        }
        if (taggablePairings.get(1n).length !== 0) {
            throw "Taggable pairings taggable 1 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_complex": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings2);
        await perfTags.toggleTagPairings(tagPairings3);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00005") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_exits": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        await perfTags.close();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00005") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_kills": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00005") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_kills_and_additional_file": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        const tagPairings4 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0002': ['tag00001','tag00033','tag00052','tag00071']}));
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
        await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        perfTags.__kill();
        perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        let {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        let strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 4) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        
        if (strTaggablePairings['tgbl0001'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00003") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00005") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
        
        ({taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings4)));
        strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0002'] === undefined) {
            throw "Taggable pairings does not have tgbl0002";
        }
        if (strTaggablePairings['tgbl0002'].length !== 4) {
            throw "Taggable pairings tgbl0002 does not have 4 tags";
        }
        if (strTaggablePairings['tgbl0002'].indexOf("tag00001") === -1 ||
            strTaggablePairings['tgbl0002'].indexOf("tag00033") === -1 ||
            strTaggablePairings['tgbl0002'].indexOf("tag00052") === -1 ||
            strTaggablePairings['tgbl0002'].indexOf("tag00071") === -1) {
            throw "Taggable pairings tgbl0002 lacks one of the placed tags";
        }
    },
    "read_deleted_tag_pairings": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003']}));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.deleteTagPairings(tagPairings2);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        const strTaggablePairings = getStrPairingsFromPairings(taggablePairings);
        if (strTaggablePairings['tgbl0001'] === undefined) {
            throw "Taggable pairings does not have tgbl0001";
        }
        if (strTaggablePairings['tgbl0001'].length !== 2) {
            throw "Taggable pairings tgbl0001 does not have 4 tags";
        }
        
        if (strTaggablePairings['tgbl0001'].indexOf("tag00002") === -1 ||
            strTaggablePairings['tgbl0001'].indexOf("tag00004") === -1) {
            throw "Taggable pairings tgbl0001 lacks one of the placed tags";
        }
    },
    "complements_make_size_smaller": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        const strTaggablePairings = {};
        let totalTaggableCount = 200;
        let totalTagCount = 8000;
        for (let i = 0; i < totalTaggableCount; ++i) {
            const tags = [];
            for (let i = 0; i < totalTagCount; ++i) {
                tags.push(`tag${i.toString().padStart(5, "0")}`);
            }

            const file = `tgbl${i.toString().padStart(4, "0")}`;
            strTaggablePairings[file] = tags;
        }
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings(strTaggablePairings));

        await perfTags.insertTaggables(PerfTags.getTaggablesFromTagPairings(tagPairings));
        await perfTags.insertTags(PerfTags.getTagsFromTagPairings(tagPairings));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.__flushAndPurgeUnusedFiles();
        if (await perfTags.close() === false) {
            throw "Perf tags timed out on close";
        }

        // * 2 inside for accounting for tag bucket + tag buckets, file bucket + file buckets storages
        // * 9 inside for 64 bit entries + complement bit
        // * 2 in addition to that as wiggle room
        const MAX_ACCEPTABLE_FILE_SIZE = (9 * (totalTaggableCount + totalTagCount) * 2) * 2;
        console.log(MAX_ACCEPTABLE_FILE_SIZE);
        const realDirectorySize = getTotalDirectoryBytes("test-dir/database-dir");
        if (realDirectorySize > MAX_ACCEPTABLE_FILE_SIZE) {
            throw `Directory size with only completely dense tags was ${realDirectorySize} bytes > ${MAX_ACCEPTABLE_FILE_SIZE} bytes indicating that complements are not implemented`;
        }
    },
    "search_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]]
        ]));
        const {ok, taggables} = await perfTags.search(PerfTags.searchTag(1n));
        if (taggables.length !== 3) {
            console.log(taggables);
            throw "Taggables search did not return 3 taggables";
        }
        if (taggables.indexOf(1n) === -1 || taggables.indexOf(2n) === -1 || taggables.indexOf(3n) === -1) {
            throw "Taggable search did not return taggable 1, 2, or 3";
        }

    },
    "search_union_functions_correctly": async (createPerfTags) => {
        appendFileSync("test-err.log", "Problem run started:\r\n");
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]]
        ]));
        const {ok, taggables} = await perfTags.search(PerfTags.searchUnion([PerfTags.searchTag(1n), PerfTags.searchTag(2n)]));
        if (taggables.length !== 5) {
            throw "Taggables search did not return 5 taggables";
        }
        if (taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1) {
            throw "Taggable search did not return taggable 1, 2, 3, 4, or 5";
        }
    },
    "search_intersect_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]]
        ]));
        const {ok, taggables} = await perfTags.search(PerfTags.searchIntersect([PerfTags.searchTag(1n), PerfTags.searchTag(2n)]));
        if (taggables.length !== 2) {
            throw "Taggables search did not return 2 taggables";
        }
        if (taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1) {
            throw "Taggable search did not return taggable 1, 2, 3, 4, or 5";
        }
    },
    "search_complex_1_functions_correctly": async (createPerfTags) => {
            appendFileSync("test-err.log", "START BAD RUN\r\n");
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]]
        ]));
        const {ok, taggables} = await perfTags.search(
            PerfTags.searchIntersect([
                PerfTags.searchUnion([PerfTags.searchTag(1n), PerfTags.searchTag(3n)]),
                PerfTags.searchTag(2n)
            ])
        );
        if (taggables.length !== 3) {
            throw "Taggables search did not return 3 taggables";
        }
        if (taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1) {
            throw "Taggable search did not return taggable 2, 3, or 4";
        }
    },
    "search_complex_2_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags("perftags.exe", ...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]]
        ]));
        const {ok, taggables} = await perfTags.search(
            PerfTags.searchUnion([
                PerfTags.searchIntersect([
                    PerfTags.searchUnion([PerfTags.searchTag(1n), PerfTags.searchTag(3n)]),
                    PerfTags.searchTag(2n)
                ]),
                PerfTags.searchTag(4n)
            ])
        );
        if (taggables.length !== 5) {
            throw "Taggables search did not return 5 taggables";
        }
        if (taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(6n) === -1
         || taggables.indexOf(7n) === -1) {
            throw "Taggable search did not return taggable 2, 3, 4, 6, or 7";
        }
    }
};
export default TESTS;