import { TEST_DEFAULT_PERF_WRITE_INPUT, TEST_DEFAULT_PERF_TAGS_ARGS } from "./helpers.js";
import PerfTags from "../../../src/perf-tags-binding/perf-tags.js"
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "fs";
import path, { dirname } from "path";
/** @import {TestFunction} from "./helpers.js" */

/**
 * @param {PerfTags} perfTags 
 * @param {string} directory 
 */
async function runInPracticeSuite(perfTags, directory) {
    const practiceSuiteEntries = readdirSync(directory);
    const practiceSuiteCommands = practiceSuiteEntries
        .filter(practiceSuiteEntry => practiceSuiteEntry.startsWith("command"))
        .sort()
        .map(commandEntry => readFileSync(path.join(directory, commandEntry)).toString());
    const practiceSuiteInputs = practiceSuiteEntries.filter(practiceSuiteEntry => practiceSuiteEntry.startsWith("perf-write-input") || practiceSuiteEntry.startsWith("perf-read-input")).sort();
    mkdirSync(dirname(TEST_DEFAULT_PERF_WRITE_INPUT), {recursive: true});
    for (let i = 0; i < practiceSuiteCommands.length; ++i) {
        const command = practiceSuiteCommands[i];
        if (command === "exit\n" || command === "exit\r\n") {
            await perfTags.reopen();
            continue;
        }
        if (practiceSuiteInputs[i].startsWith("perf-write-input")) {
            copyFileSync(path.join(directory, practiceSuiteInputs[i]), TEST_DEFAULT_PERF_WRITE_INPUT);
        } else {
            copyFileSync(path.join(directory, practiceSuiteInputs[i]), TEST_DEFAULT_PERF_READ_INPUT);
        }
        perfTags.__writeToStdin(command.replaceAll("\r\n", PerfTags.NEWLINE));
        if (practiceSuiteInputs[i].startsWith("perf-write-input")) {
            await perfTags.__dataOrTimeout(PerfTags.WRITE_OK_RESULT, 60000);
        } else {
            await perfTags.__dataOrTimeout(PerfTags.READ_OK_RESULT, 60000);
        }
    }
}
/**
 * @type {Record<string, TestFunction>}
 */
const TESTS = {
    /* in practice what happened:
        file was inserted before tag-file bucket with complement could initialize, this caused it's late initialization to include the file in the complement set
        as it did not know it had been inserted from insertComplement
    */
    "in-practice-example-1": async (createPerfTags) => {
        let perfTags = createPerfTags(...TEST_DEFAULT_PERF_TAGS_ARGS);
        await runInPracticeSuite(perfTags, "tests/in-practice-examples/in-practice-example-1");
    }
};
export default TESTS;