import { FILES_TESTS } from "./test-functionality/files.js";
import { PAGES_TESTS } from "./test-functionality/pages.js";
import { METRICS_TESTS } from "./test-functionality/metrics.js";
import { BUG_PRIORITIES, BUG_NOTICES, BUG_IMPACTS, IMPLEMENTATION_DIFFICULTIES } from "../unimplemented-test-info.js";
import { TAGS_TESTS } from "./test-functionality/tags.js";
import { TAGGABLES_TESTS } from "./test-functionality/taggables.js";

/** @import {TestSuite} from "./test-suites.js" */

/** @type {TestSuite[]} */
export const FUNCTIONAL_TESTS = [
    {name: "Files", tests: FILES_TESTS},
    {name: "Pages", tests: PAGES_TESTS},
    {name: "Tags", tests: TAGS_TESTS},
    {name: "Taggables", tests: TAGGABLES_TESTS},
    {name: "Metrics", tests: METRICS_TESTS},
    {name: "Parsers", tests: {
        priority: BUG_PRIORITIES.NEXT_WORK,
        noticeability: BUG_NOTICES.ONLY_DEV,
        impact: BUG_IMPACTS.ASSUMED_WORKING,
        expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR
    }},
];