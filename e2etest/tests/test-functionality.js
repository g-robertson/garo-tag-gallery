import { FILES_TESTS } from "./test-functionality/files.js";
import { PAGES_TESTS } from "./test-functionality/pages.js";
import { METRICS_TESTS } from "./test-functionality/metrics.js";


/** @type {TestSuite[]} */
export const FUNCTIONAL_TESTS = [
    {name: "Files", tests: FILES_TESTS},
    {name: "Pages", tests: PAGES_TESTS},
    {name: "Metrics", tests: METRICS_TESTS}
];