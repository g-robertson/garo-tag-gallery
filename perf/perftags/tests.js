import { appendFileSync, rmSync } from "fs";

import DOES_NOT_CRASH_TESTS from "./tests/does-not-crash.js";
import DOES_HE_PERFORM_TESTS from "./tests/does-he-perform.js";
import LOAD_TESTS from "./tests/load-tests.js";
import IN_PRACTICE_TESTS from "./tests/in-practice-tests.js";
import PerfTags from "../src/perf-tags-binding/perf-tags.js";

const TESTS = {
    ...IN_PRACTICE_TESTS,
    ...DOES_NOT_CRASH_TESTS,
    ...DOES_HE_PERFORM_TESTS,
    ...LOAD_TESTS,
};

const DISABLED_TEST_CASES = [
    ...Object.keys(LOAD_TESTS),
];

async function main() {
    /** @type {PerfTags[]} */
    let PERF_TAGS = [];
    /**
     * @param {(...args: ConstructorParameters<typeof PerfTags>)}
     */
    const createPerfTags = (...args) => {
        const perfTags = new PerfTags(...args);
        perfTags.__addStderrListener((data) => {
            appendFileSync("test-err.log", data);
        });
        PERF_TAGS.push(perfTags);
        return perfTags;
    }
    for (const test in TESTS) {
        if (DISABLED_TEST_CASES.indexOf(test) !== -1) {
            continue;
        }
        rmSync("test-dir", {'recursive': true, 'force': true});
        await TESTS[test](createPerfTags);
        for (const perfTags of PERF_TAGS) {
            await perfTags.close();
        }
        PERF_TAGS = [];
        console.log(`Test case "${test}" passed`);
    }

    process.exit(0);
}

main();