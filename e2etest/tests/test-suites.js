/** @import {ThenableWebDriver} from "selenium-webdriver" */

import { deleteAll, killServer, spawnServer } from "../server.js";
import { authenticate } from "./authenticate.js";
import { NAVIGATION_TESTS } from "./test-navigation.js";
import { POPULATE_DATA_TESTS } from "./populate-data.js";
import { FUNCTIONAL_TESTS } from "./test-functionality.js";
import { BaseLogEntry } from "selenium-webdriver/bidi/logEntries.js";

/** @typedef {(driver: ThenableWebDriver) => Promise<void>} TestFn */

/**
 * @typedef {Object} TestSuite
 * @property {string} name
 * @property {TestSuite[] | TestFn} tests
 * @property {boolean=} isSetup
 * @property {boolean=} isTeardown
 */


/** @typedef {Record<string, boolean | DisabledTests>} DisabledTests */

const TESTS = {
    name: "Tests",
    tests: [
        // Once navigate screens dry, to catch any errors that may occur in absence of data
        {name: "Navigation", tests: NAVIGATION_TESTS},
        // Then populate data
        {name: "PopulateData", tests: POPULATE_DATA_TESTS},
        // Then test functionality with data
        {name: "Functional", tests: FUNCTIONAL_TESTS},
    ]
};

export const HEADLESS = false;
const DISABLED_TESTS = new Set([
    // "Tests.Functional.Pages.FileSearchPage.ThumbnailGallery.DoesModifyTaggablesWork.DoesRemovingTagWork",
    "Tests.Navigation",
    "Tests.Functional.Backup",
    "Tests.Functional.Pages.FileSearchPage.TagSearch",
    // "Tests.Functional",
]);
const HALT_ON_FAILURE = false;
const HALT_AFTER = new Set([]);

let testsHalted = false;


/**
 * @param {TestSuite} testSuite 
 * @param {string} previousContext
 * @param {ThenableWebDriver} driver
 */
async function executeTestSuite_(testSuite, previousContext, driver) {
    if (testsHalted) {
        return;
    }
    testSuite.isSetup ??= false;
    testSuite.isTeardown ??= false;
    let currentContext = testSuite.name;
    if (previousContext !== "") {
        currentContext = `${previousContext}.${testSuite.name}`;
    }
    if (DISABLED_TESTS.has(currentContext)) {
        console.log(`Skipping tests: ${currentContext}`);
        return;
    }
    console.log(`Executing tests: ${currentContext}`);

    /** @type {TestSuite[]} */
    let teardowns = [];
    if (typeof testSuite.tests === "function") {
        try {
            await testSuite.tests(driver);
        } catch (e) {
            if (HALT_ON_FAILURE) {
                testsHalted = true;
            }
            const err = e.stack ?? e;
            console.log(`Failed test: ${currentContext} with error ${err}`);
        }
    } else {
        for (const test of testSuite.tests) {
            if (test.isTeardown ?? false) {
                teardowns.push(test);
            } else {
                await executeTestSuite_(test, currentContext, driver);
            }
        }
    }

    for (const teardown of teardowns) {
        await executeTestSuite_(teardown, currentContext, driver);
    }

    if (HALT_AFTER.has(currentContext)) {
        testsHalted = true;
    }
}

/**
 * @param {ThenableWebDriver} driver
 * @param {BaseLogEntry[]} logs
 */
export async function executeTestSuite(driver, logs) {
    await deleteAll();
    const accessKey = await spawnServer();
    await authenticate(driver, process.env.PORT, accessKey);
    await executeTestSuite_(TESTS, "", driver);
    //After all done, check the log for any errors not caught by testing
    console.log("Printing all NON-OK browser console logs");
    const OK_LOGS = new Set(["info"]);
    const badLogs = logs.filter(log => !OK_LOGS.has(log.level));
    for (const log of badLogs) {
        console.log(log);
    }
    if (badLogs.length === 0) {
        console.log("E2E testing passed");
    }
    await killServer();
}