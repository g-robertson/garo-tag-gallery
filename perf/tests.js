import { rmSync } from "fs";
import { exitCurrentPerfTags, resetCurrentPerfTags } from "./tests/helpers.js";

import DOES_NOT_CRASH_TESTS from "./tests/does-not-crash.js";
import DOES_HE_PERFORM_TESTS from "./tests/does-he-perform.js";

const TESTS = {
    ...DOES_NOT_CRASH_TESTS,
    ...DOES_HE_PERFORM_TESTS
};

async function main() {
    for (const test in TESTS) {
        rmSync("tag-pairings", {'recursive': true, 'force': true})
        rmSync("perf-output.txt", {"force": true});
        await TESTS[test]();
        console.log(`Test case "${test}" passed`);
        resetCurrentPerfTags();
    }
    await exitCurrentPerfTags();
}

main();