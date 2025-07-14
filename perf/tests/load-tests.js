
import { strTaggablePairingsToStrTagPairings, getPairingsFromStrPairings, TEST_DEFAULT_PERF_TAGS_ARGS, getTotalDirectoryBytes } from "./helpers.js";import PerfTags from "../../src/perf-tags-binding/perf-tags.js"
/** @import {TestFunction} from "./helpers.js" */


/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    "many_taggables_does_not_take_too_long": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        let totalTaggableCount = 100000n;
        const taggables = [];
        for (let j = 0n; j < totalTaggableCount; ++j) {
            taggables.push(j);
        }

        const start = Date.now();
        await perfTags.insertTaggables(taggables);
        const timeTaken = Date.now() - start;
        if (timeTaken > 300) {
            throw `Inserting files took too long, ${timeTaken}>300ms for 100,000 taggables`;
        }
    },
    "many_tags_does_not_take_too_long": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        let totalTagCount = 100000n;
        const tags = [];
        for (let j = 0n; j < totalTagCount; ++j) {
            tags.push(j);
        }

        const start = Date.now();
        await perfTags.insertTags(tags);
        const timeTaken = Date.now() - start;
        if (timeTaken > 300) {
            throw `Inserting files took too long, ${timeTaken}>300ms for 100,000 tags`;
        }
    },
    "many_file_pairings_does_not_take_too_long": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = new Map();
        let totalTaggableCount = 500n;
        let totalTagCount = 100n;
        const taggables = [];
        for (let j = 0n; j < totalTaggableCount; ++j) {
            taggables.push(j);
        }
        for (let i = 0n; i < totalTagCount; ++i) {
            tagPairings.set(i, taggables);
        }

        const start = Date.now();
        await perfTags.insertTagPairings(tagPairings);
        const timeTaken = Date.now() - start;
        if (timeTaken > 300) {
            throw `Inserting files took too long, ${timeTaken}>300ms for 1,000,000 tags`;
        }
    },
    "many_files_search_does_not_take_too_long": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = new Map();
        let tagN = 0n;
        let totalTaggableCount = 100000;
        for (let i = 1; i < totalTaggableCount / 400; i *= 2) {

            for (let j = 0; j < i; ++j) {
                const taggables = new Set();
                for (let k = 0; k < totalTaggableCount / i; ++k) {
                    taggables.add(BigInt(Math.floor(Math.random() * totalTaggableCount)));
                }
                tagPairings.set(tagN, [...taggables]);
                ++tagN;
            }
        }

        await perfTags.insertTagPairings(tagPairings);

        const randomIntersection = [];
        for (let i = 0; i < 5; ++i) {
            randomIntersection.push(BigInt(Math.floor(Math.random() * tagPairings.size)));
        }

        const start = Date.now();
        await perfTags.search(PerfTags.searchIntersect(randomIntersection.map(PerfTags.searchTag)));
        const timeTaken = Date.now() - start;
        if (timeTaken > 100) {
            throw `Searching files took too long, ${timeTaken}>100ms`;
        }
    },
    "complements_make_size_smaller": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        const tagPairings = new Map();
        let totalTaggableCount = 200n;
        let totalTagCount = 8000n;
        const taggables = [];
        for (let j = 0n; j < totalTaggableCount; ++j) {
            taggables.push(j);
        }
        for (let i = 0n; i < totalTagCount; ++i) {
            tagPairings.set(i, taggables);
        }

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
        const MAX_ACCEPTABLE_FILE_SIZE = (9 * Number(totalTaggableCount + totalTagCount) * 2) * 2;
        const realDirectorySize = await getTotalDirectoryBytes("test-dir/database-dir");
        if (realDirectorySize > MAX_ACCEPTABLE_FILE_SIZE) {
            throw `Directory size with only completely dense tags was ${realDirectorySize} bytes > ${MAX_ACCEPTABLE_FILE_SIZE} bytes indicating that complements are not implemented`;
        }
    },
};
export default TESTS;