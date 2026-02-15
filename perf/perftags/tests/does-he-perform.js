import { appendFileSync, statSync } from "fs";
import { strTaggablePairingsToStrTagPairings, getPairingsFromStrPairings, getStrPairingsFromPairings, TEST_DEFAULT_PERF_TAGS_ARGS, getTotalDirectoryBytes, TEST_DEFAULT_DATABASE_DIR } from "./helpers.js";
import PerfTags from "../../../src/perf-binding/perf-tags.js"
/** @import {TestFunction} from "./helpers.js" */


/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    "read_taggables_tags": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));
        await perfTags.insertTagPairings(tagPairings);
        const {ok, taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n).length !== 4) {
            throw "Taggable pairings 1 does not have 4 tags";
        }
        if (taggablePairings.get(1n).indexOf(1n) === -1 ||
            taggablePairings.get(1n).indexOf(2n) === -1 ||
            taggablePairings.get(1n).indexOf(3n) === -1 ||
            taggablePairings.get(1n).indexOf(4n) === -1) {
            throw "Taggable pairings 1 lacks one of the placed tags";
        }
    },
    "read_taggables_tags_after_exit": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));
        await perfTags.insertTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n).length !== 4) {
            throw "Taggable pairings 1 does not have 4 tags";
        }
        if (taggablePairings.get(1n).indexOf(1n) === -1 ||
            taggablePairings.get(1n).indexOf(2n) === -1 ||
            taggablePairings.get(1n).indexOf(3n) === -1 ||
            taggablePairings.get(1n).indexOf(4n) === -1) {
            throw "Taggable pairings 1 lacks one of the placed tags";
        }
    },
    "read_taggables_tags_after_kill": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));
        await perfTags.insertTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n).length !== 4) {
            throw "Taggable pairings 1 does not have 4 tags";
        }
        if (taggablePairings.get(1n).indexOf(1n) === -1 ||
            taggablePairings.get(1n).indexOf(2n) === -1 ||
            taggablePairings.get(1n).indexOf(3n) === -1 ||
            taggablePairings.get(1n).indexOf(4n) === -1) {
            throw "Taggable pairings 1 lacks one of the placed tags";
        }
    },
    "read_taggables_specific_tags": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));
        await perfTags.insertTagPairings(tagPairings);
        const {ok, taggablePairings} = await perfTags.readTaggablesSpecifiedTags(PerfTags.getTaggablesFromTagPairings(tagPairings), [1n,3n]);
        if (taggablePairings.get(1n).length !== 2) {
            throw "Taggable pairings 1 does not have 2 tags";
        }
        if (taggablePairings.get(1n).indexOf(1n) === -1 ||
            taggablePairings.get(1n).indexOf(3n) === -1) {
            throw "Taggable pairings 1 lacks one of the placed tags";
        }
    },
    "read_taggables_specific_tags_should_not_read_count": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[2n, [1n,2n,3n,4n]]]));
        await perfTags.insertTagPairings(tagPairings);
        const {ok, taggablePairings} = await perfTags.readTaggablesSpecifiedTags(PerfTags.getTaggablesFromTagPairings(tagPairings), [1n,3n]);
        if (taggablePairings.get(2n).length !== 2) {
            throw "Taggable pairings 1 does not have 2 tags";
        }
        if (taggablePairings.get(2n).indexOf(1n) === -1 ||
            taggablePairings.get(2n).indexOf(3n) === -1) {
            throw "Taggable pairings 1 lacks one of the placed tags";
        }
    },
    "insert_tags_between_toggle_tag_pairings_should_not_cause_problem": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));

        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n) === undefined) {
            throw "Taggable pairings does not have taggable 1";
        }
        if (taggablePairings.get(1n).length !== 0) {
            throw "Taggable pairings taggable 1 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_kill": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n,2n,3n,4n]]]));

        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        if (taggablePairings.get(1n) === undefined) {
            throw "Taggable pairings does not have taggable 1";
        }
        if (taggablePairings.get(1n).length !== 0) {
            throw "Taggable pairings taggable 1 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_complex": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.toggleTagPairings(tagPairings);
        await perfTags.close();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        await perfTags.close();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        await perfTags.close();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00004']}));
        const tagPairings2 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00003','tag00005','tag00007']}));
        const tagPairings3 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0001': ['tag00001','tag00002','tag00003','tag00007']}));
        const tagPairings4 = getPairingsFromStrPairings(strTaggablePairingsToStrTagPairings({'tgbl0002': ['tag00001','tag00033','tag00052','tag00071']}));
        await perfTags.toggleTagPairings(tagPairings);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings2);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings3);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.toggleTagPairings(tagPairings4);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.readTaggablesTags(PerfTags.getTaggablesFromTagPairings(tagPairings));
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
    "delete_tags_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]],
            [5n, [6n,8n]]
        ]));
        await perfTags.deleteTags([2n, 3n]);
        const {taggablePairings} = await perfTags.readTaggablesTags([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]);
        
        if (taggablePairings.size !== 8) {
            throw "taggable pairings does not have size 8";
        }

        if (taggablePairings.get(1n).length !== 1
         || taggablePairings.get(1n).indexOf(1n) === -1
         || taggablePairings.get(2n).length !== 1
         || taggablePairings.get(2n).indexOf(1n) === -1
         || taggablePairings.get(3n).length !== 1
         || taggablePairings.get(3n).indexOf(1n) === -1
         || taggablePairings.get(4n).length !== 0
         || taggablePairings.get(5n).length !== 0
         || taggablePairings.get(6n).length !== 2
         || taggablePairings.get(6n).indexOf(4n) === -1
         || taggablePairings.get(6n).indexOf(5n) === -1
         || taggablePairings.get(7n).length !== 1
         || taggablePairings.get(7n).indexOf(4n) === -1
         || taggablePairings.get(8n).length !== 1
         || taggablePairings.get(8n).indexOf(5n) === -1) {
            throw "One of the taggables returned lacks one of the placed tags";
        }
    },
    "delete_tags_functions_correctly_with_kill": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]],
            [5n, [6n,8n]]
        ]));
        await perfTags.deleteTags([2n, 3n]);
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const {taggablePairings} = await perfTags.readTaggablesTags([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]);
        
        if (taggablePairings.size !== 8) {
            throw "taggable pairings does not have size 8";
        }

        if (taggablePairings.get(1n).length !== 1
         || taggablePairings.get(1n).indexOf(1n) === -1
         || taggablePairings.get(2n).length !== 1
         || taggablePairings.get(2n).indexOf(1n) === -1
         || taggablePairings.get(3n).length !== 1
         || taggablePairings.get(3n).indexOf(1n) === -1
         || taggablePairings.get(4n).length !== 0
         || taggablePairings.get(5n).length !== 0
         || taggablePairings.get(6n).length !== 2
         || taggablePairings.get(6n).indexOf(4n) === -1
         || taggablePairings.get(6n).indexOf(5n) === -1
         || taggablePairings.get(7n).length !== 1
         || taggablePairings.get(7n).indexOf(4n) === -1
         || taggablePairings.get(8n).length !== 1
         || taggablePairings.get(8n).indexOf(5n) === -1) {
            throw "One of the taggables returned lacks one of the placed tags";
        }
    },
    "delete_tags_functions_correctly_with_reopen": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]],
            [5n, [6n,8n]]
        ]));
        await perfTags.deleteTags([2n, 3n]);
        await perfTags.reopen();
        const {taggablePairings} = await perfTags.readTaggablesTags([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]);
        
        if (taggablePairings.size !== 8) {
            throw "taggable pairings does not have size 8";
        }

        if (taggablePairings.get(1n).length !== 1
         || taggablePairings.get(1n).indexOf(1n) === -1
         || taggablePairings.get(2n).length !== 1
         || taggablePairings.get(2n).indexOf(1n) === -1
         || taggablePairings.get(3n).length !== 1
         || taggablePairings.get(3n).indexOf(1n) === -1
         || taggablePairings.get(4n).length !== 0
         || taggablePairings.get(5n).length !== 0
         || taggablePairings.get(6n).length !== 2
         || taggablePairings.get(6n).indexOf(4n) === -1
         || taggablePairings.get(6n).indexOf(5n) === -1
         || taggablePairings.get(7n).length !== 1
         || taggablePairings.get(7n).indexOf(4n) === -1
         || taggablePairings.get(8n).length !== 1
         || taggablePairings.get(8n).indexOf(5n) === -1) {
            throw "One of the taggables returned lacks one of the placed tags";
        }
    },
    "delete_tags_empties_bucket": async (createPerfTags) => {
        
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]],
            [5n, [6n,8n]]
        ]));
        await perfTags.deleteTags([1n]);
        await perfTags.deleteTags([2n]);
        await perfTags.deleteTags([3n]);
        await perfTags.reopen();
        await perfTags.deleteTags([4n]);
        await perfTags.deleteTags([5n]);
        await perfTags.__flushAndPurgeUnusedFiles();
        if (statSync(`${TEST_DEFAULT_DATABASE_DIR}/buckets/tag-bucket/bucket.tbd`).size > 8) {
            throw "Size of tag bucket should not be greater than 8 after deletion and flush";
        }
    },
    "search_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]]
        ]));
        const {ok, taggables} = await perfTags.search(PerfTags.searchTag(1n));
        if (taggables.length !== 3) {
            throw "Taggables search did not return 3 taggables";
        }
        if (taggables.indexOf(1n) === -1 || taggables.indexOf(2n) === -1 || taggables.indexOf(3n) === -1) {
            throw "Taggable search did not return taggable 1, 2, or 3";
        }

    },
    "search_union_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
    },
    "search_complex_3_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
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
                    PerfTags.searchComplement(PerfTags.searchTag(2n))
                ]),
                PerfTags.searchTag(4n)
            ])
        );
        if (taggables.length !== 4) {
            throw "Taggables search did not return 4 taggables";
        }
        if (taggables.indexOf(1n) === -1
         || taggables.indexOf(6n) === -1
         || taggables.indexOf(7n) === -1
         || taggables.indexOf(8n) === -1) {
            throw "Taggable search did not return taggable 1, 6, 7, or 8";
        }
    },
    "search_complex_4_functions_correctly": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n, [1n,2n,3n]],
            [2n, [2n,3n,4n,5n]],
            [3n, [4n,8n]],
            [4n, [6n,7n]]
        ]));
        const {ok, taggables} = await perfTags.search(
            PerfTags.searchUnion([
                PerfTags.searchComplement(PerfTags.searchIntersect([
                    PerfTags.searchUnion([PerfTags.searchTag(1n), PerfTags.searchTag(3n)]),
                    PerfTags.searchTag(2n)
                ])),
                PerfTags.searchTag(4n)
            ])
        );
        if (taggables.length !== 5) {
            throw "Taggables search did not return 5 taggables";
        }
        if (taggables.indexOf(1n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
         || taggables.indexOf(7n) === -1
         || taggables.indexOf(8n) === -1) {
            throw "Taggable search did not return taggable 1, 5, 6, 7, or 8";
        }
    },
    "cache_file_should_be_either_prior_or_present": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        // make taggable with excessively overloaded tags to make it complement
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n]]])));
        // force flush to go from write ahead file to db file
        await perfTags.__flushAndPurgeUnusedFiles();
        // cache file = 1 -> 1-10, db file => 1 -> 1-10
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(new Map([[1n, [11n, 12n, 13n, 14n,]]])));
        // cache file is 1 -> 1-14, but db file is 1 -> 1-10
        // if we crash here, in between, it could think cache file is 1-14, when in reality the only two valid states to return to are 1 => 1-10 or 1 => 1-15
        // so we need to write the cache file back to 1 -> 1-10 before writing the .ta file
        // override to fail between writing complement pairings and singles
        await perfTags.__override("fail_tags_insert_between_pairings_and_singles_writes");
        // add another tag but with failure mode on, should cause mismatch between cache file being 1-14, but tbd file only containing 1-10
        perfTags.__expectError();
        const result = await perfTags.insertTags([15n]);
        // if passed, then the override didn't work
        if (result === true) {
            throw "Override for failure did not cause failure";
        }

        // reopen perfTags
        perfTags.__kill();
        perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        // read tags should yield 1 => 1-10 cache variant
        const {taggablePairings} = await perfTags.readTaggablesTags([1n]);
        if (taggablePairings.size != 1
         || taggablePairings.get(1n).length !== 10
         || taggablePairings.get(1n).indexOf(1n) === -1
         || taggablePairings.get(1n).indexOf(2n) === -1
         || taggablePairings.get(1n).indexOf(3n) === -1
         || taggablePairings.get(1n).indexOf(4n) === -1
         || taggablePairings.get(1n).indexOf(5n) === -1
         || taggablePairings.get(1n).indexOf(6n) === -1
         || taggablePairings.get(1n).indexOf(7n) === -1
         || taggablePairings.get(1n).indexOf(8n) === -1
         || taggablePairings.get(1n).indexOf(9n) === -1
         || taggablePairings.get(1n).indexOf(10n) === -1
        ) {
            throw "Could not find one of the assigned taggable's tags"
        }
    },
    "simple_tag_occurrences_compared_to_n": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const taggablePairings = new Map([
            [1n, [1n]],
            [2n, [1n]],
            [3n, [1n]],
            [4n, [1n,2n]],
            [5n, [2n]],
            [6n, [2n]],
        ]);
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
        let {taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)],[PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.SEARCH_UNIVERSE, ">", 3)]));
        if (taggables.length !== 4
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 1";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)],[PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.SEARCH_UNIVERSE, ">=", 3)])));
        if (taggables.length !== 6
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 2";
        }

        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)],[PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.SEARCH_UNIVERSE, "<", 4)])));
        if (taggables.length !== 3
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 3";
        }

        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)],[PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.SEARCH_UNIVERSE, "<=", 4)])));
        if (taggables.length !== 6
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 4";
        }
    },
    "complex_tag_occurrences_compared_to_n": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const taggablePairings = new Map([
            [1n, [1n,   3n,      6n]],
            [2n, [1n,   3n,      6n]],
            [3n, [1n,   3n,      6n]],
            [4n, [1n,2n,      5n   ]],
            [5n, [   2n,   4n,5n   ]],
            [6n, [   2n,   4n,   6n]],
        ]);
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
        let {taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.searchUnion([
            PerfTags.searchTag(3n),
            PerfTags.searchTag(4n)
        ]), ">", 3)]));
        if (taggables.length !== 0) {
            throw "Could not find one of the taggables that was supposed to be returned from case 1";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.searchUnion([
            PerfTags.searchTag(3n),
            PerfTags.searchTag(4n)
        ]), ">=", 3)])));
        if (taggables.length !== 4
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 2";
        }

        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.searchUnion([
            PerfTags.searchTag(3n),
            PerfTags.searchTag(4n)
        ]), "<=", 3)])));
        if (taggables.length !== 6
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 3";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(PerfTags.searchUnion([
            PerfTags.searchTag(3n),
            PerfTags.searchTag(4n)
        ]), "<", 3)])));
        if (taggables.length !== 3
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 4";
        }
    },
    "complex_tag_occurrences_compared_to_n_percent": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const taggablePairings = new Map([
            [1n, [1n,   3n,      6n]],
            [2n, [1n,   3n,      6n]],
            [3n, [1n,   3n,      6n]],
            [4n, [1n,2n,      5n   ]],
            [5n, [   2n,   4n,5n   ]],
            [6n, [   2n,   4n,   6n]],
        ]);
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
        let {taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), ">", 0.7)
        ]));
        if (taggables.length !== 4
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 1";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), "<", 0.7)
        ])));
        if (taggables.length !== 3
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 2";
        }

        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), "<=", 0.75)
        ])));
        if (taggables.length !== 6
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 3";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), ">", 0.65)
        ])));
        if (taggables.length !== 6
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 4";
        }
    },
    "complex_filtered_tag_occurrences_compared_to_n_percent": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const taggablePairings = new Map([
            [1n , [1n,   3n,      6n]], // FILTERED
            [2n , [1n,   3n,   5n   ]], // FILTERED
            [3n , [1n,   3n,        ]], // FILTERED
            [4n , [1n,              ]],
            [5n , [1n,      4n,5n   ]], // FILTERED
            [6n , [1n,2n,      5n   ]],
            [7n , [   2n,   4n,5n   ]], // FILTERED
            [8n , [   2n,   4n,     ]], // FILTERED
            [9n , [   2n,   4n,5n,6n]], // FILTERED
            [10n, [   2n,           ]],
        ]);
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
        let {taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionFilteredExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), PerfTags.searchUnion([
                PerfTags.searchTag(5n),
                PerfTags.searchTag(6n)
            ]), ">", 0.7)
        ]));

        if (taggables.length !== 6
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 1";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionFilteredExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), PerfTags.searchUnion([
                PerfTags.searchTag(5n),
                PerfTags.searchTag(6n)
            ]), "<", 0.7)
        ])));
        if (taggables.length !== 5
         || taggables.indexOf(6n) === -1
         || taggables.indexOf(7n) === -1
         || taggables.indexOf(8n) === -1
         || taggables.indexOf(9n) === -1
         || taggables.indexOf(10n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 2";
        }

        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionFilteredExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), PerfTags.searchUnion([
                PerfTags.searchTag(5n),
                PerfTags.searchTag(6n)
            ]), "<=", 0.75)
        ])))
        if (taggables.length !== 10
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
         || taggables.indexOf(7n) === -1
         || taggables.indexOf(8n) === -1
         || taggables.indexOf(9n) === -1
         || taggables.indexOf(10n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 3";
        }
        
        ({taggables} = await perfTags.search(PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionFilteredExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), PerfTags.searchUnion([
                PerfTags.searchTag(5n),
                PerfTags.searchTag(6n)
            ]), ">", 0.65)
        ])))
        if (taggables.length !== 10
         || taggables.indexOf(1n) === -1
         || taggables.indexOf(2n) === -1
         || taggables.indexOf(3n) === -1
         || taggables.indexOf(4n) === -1
         || taggables.indexOf(5n) === -1
         || taggables.indexOf(6n) === -1
         || taggables.indexOf(7n) === -1
         || taggables.indexOf(8n) === -1
         || taggables.indexOf(9n) === -1
         || taggables.indexOf(10n) === -1
        ) {
            throw "Could not find one of the taggables that was supposed to be returned from case 4";
        }
    },
    
    "complex_filtered_tag_occurrences_compared_to_n_percent_with_intersect_works": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const taggablePairings = new Map([
            [1n , [1n,   3n,      6n]], // FILTERED
            [2n , [1n,   3n,   5n   ]], // FILTERED
            [3n , [1n,   3n,        ]], // FILTERED
            [4n , [1n,              ]],
            [5n , [1n,      4n,5n   ]], // FILTERED
            [6n , [1n,2n,      5n   ]],
            [7n , [   2n,   4n,5n   ]], // FILTERED
            [8n , [   2n,   4n,     ]], // FILTERED
            [9n , [   2n,   4n,5n,6n]], // FILTERED
            [10n, [   2n,           ]],
        ]);
        await perfTags.insertTagPairings(PerfTags.getTagPairingsFromTaggablePairings(taggablePairings));
        let {taggables} = await perfTags.search(PerfTags.searchIntersect([PerfTags.searchConditionalExpressionListUnion([PerfTags.searchTag(1n),PerfTags.searchTag(2n)], [
            PerfTags.searchExpressionListUnionConditionFilteredExpressionOccurrencesComparedToNPercentWithinCompareExpression(PerfTags.searchUnion([
                PerfTags.searchTag(3n),
                PerfTags.searchTag(4n)
            ]), PerfTags.searchUnion([
                PerfTags.searchTag(5n),
                PerfTags.searchTag(6n)
            ]), ">", 0.7)
        ]), PerfTags.searchTag(3n)]));

        if (taggables.length !== 3
         && taggables.indexOf(1n) !== -1
         && taggables.indexOf(2n) !== -1
         && taggables.indexOf(3n) !== -1
        ) {
            throw "Missing taggables from expected set of returned taggables";
        }
    },
    "tags_taggable_counts_are_correct": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n,[1n,2n,3n]],
            [2n,[3n,4n,5n]],
            [3n,[2n,3n]],
            [4n,[1n]],
        ]));

        const {tagGroupsTaggableCounts} =await perfTags.readTagGroupsTaggableCounts([[1n],[2n],[3n],[4n]]);
        if (tagGroupsTaggableCounts.length !== 4
         || tagGroupsTaggableCounts[0] !== 3
         || tagGroupsTaggableCounts[1] !== 3
         || tagGroupsTaggableCounts[2] !== 2
         || tagGroupsTaggableCounts[3] !== 1
        ) {
            throw "Wrong count of tag with tags taggable counts";
        }
    },
    "tags_taggable_counts_with_search_are_correct": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n,[1n,2n,3n,4n]],
            [2n,[3n,4n,5n]],
            [3n,[2n,3n,7n,8n]],
            [4n,[1n]],
        ]));

        const {tagGroupsTaggableCounts} = await perfTags.readTagGroupsTaggableCounts([[1n],[2n],[3n],[4n]], PerfTags.searchUnion([PerfTags.searchTag(3n), PerfTags.searchTag(4n)]));
        if (tagGroupsTaggableCounts.length !== 4
         || tagGroupsTaggableCounts[0] !== 3
         || tagGroupsTaggableCounts[1] !== 1
         || tagGroupsTaggableCounts[2] !== 4
         || tagGroupsTaggableCounts[3] !== 1
        ) {
            throw "Wrong count of tag with tags taggable counts";
        }
    },
    "tag_groups_taggable_counts_are_correct": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n,[1n,2n,3n,4n]],
            [2n,[3n,4n,5n]],
            [3n,[2n,3n,7n,8n]],
            [4n,[1n]],
        ]));

        const {tagGroupsTaggableCounts} = await perfTags.readTagGroupsTaggableCounts([[1n,2n],[2n,3n],[3n,4n]]);
        if (tagGroupsTaggableCounts.length !== 3
         || tagGroupsTaggableCounts[0] !== 5
         || tagGroupsTaggableCounts[1] !== 6
         || tagGroupsTaggableCounts[2] !== 5
        ) {
            throw "Wrong count of tag with tag groups taggable counts";
        }
    },
    "tag_groups_taggable_counts_with_search_are_correct": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await perfTags.insertTagPairings(new Map([
            [1n,[1n,2n,3n,4n]],
            [2n,[3n,4n,5n]],
            [3n,[2n,3n,7n,8n]],
            [4n,[1n]],
        ]));

        const {tagGroupsTaggableCounts} = await perfTags.readTagGroupsTaggableCounts([[1n,2n],[2n,3n],[3n,4n]], PerfTags.searchUnion([PerfTags.searchTag(3n), PerfTags.searchTag(4n)]));
        if (tagGroupsTaggableCounts.length !== 3
         || tagGroupsTaggableCounts[0] !== 3
         || tagGroupsTaggableCounts[1] !== 4
         || tagGroupsTaggableCounts[2] !== 5
        ) {
            throw "Wrong count of tag with tag groups taggable counts";
        }
    },
};
export default TESTS;