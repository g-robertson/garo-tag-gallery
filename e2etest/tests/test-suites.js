/** @import {ThenableWebDriver} from "selenium-webdriver" */

import { deleteAll, killServer, spawnServer } from "../server.js";
import { authenticate } from "./authenticate.js";
import { NAVIGATION_TESTS } from "./test-navigation.js";
import { POPULATE_DATA_TESTS } from "./populate-data.js";
import { FUNCTIONAL_TESTS } from "./test-functionality.js";
import { BaseLogEntry } from "selenium-webdriver/bidi/logEntries.js";

/** @typedef {(driver: ThenableWebDriver) => Promise<void>} TestFn */
/** @import {UnimplementedTestInfo} from "../unimplemented-test-info.js" */



/**
 * @typedef {Object} TestSuite
 * @property {string} name
 * @property {TestSuite[] | TestFn | UnimplementedTestInfo} tests
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

export const OK_LOGS = new Set(["info"]);
export const HEADLESS = false;
const DISABLED_TESTS = new Set([
    "Tests.Navigation",
    // "Tests.PopulateData",
    // "Tests.Functional",
    "Tests.Functional.Files",
    "Tests.Functional.Files.ImportFilesFromHydrus.TestImportFilesFromHydrus",
    // "Tests.Functional.Pages",
    "Tests.Functional.Pages.FileSearchPage",
    "Tests.Functional.Pages.FileSearchPage.TagSearch",
    "Tests.Functional.Tags",
    "Tests.Functional.Taggables",
    "Tests.Functional.Metrics",
    // "Tests.Functional.Pages.DuplicatesProcessingPage"
]);
const HALT_ON_FAILURE = true;
const HALT_AFTER = new Set([]);
const DISPLAY_PRIORITY_ITEMS = 0;

let testFailCount = 0;
let testCount = 0;
let testsHalted = false;

/** @type {UnimplementedTestInfo[]} */
const unimplementedTests = [];


/**
 * @param {TestSuite} testSuite 
 * @param {string} previousContext
 * @param {ThenableWebDriver} driver
 * @param {boolean} skippingTests
 */
async function executeTestSuite_(testSuite, previousContext, driver, skippingTests) {
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
        skippingTests = true;
    }

    /** @type {TestSuite[]} */
    let teardowns = [];
    if (typeof testSuite.tests === "function") {
        if (skippingTests) {
            return;
        }
        console.log(`Executing tests: ${currentContext}`);

        ++testCount;
        try {
            await testSuite.tests(driver);
        } catch (e) {
            ++testFailCount;
            if (HALT_ON_FAILURE) {
                testsHalted = true;
            }
            const err = e.stack ?? e;
            console.log(`Failed test: ${currentContext} with error ${err}`);
        }
    } else if (testSuite.tests instanceof Array) {
        for (const test of testSuite.tests) {
            if (test.isTeardown ?? false) {
                teardowns.push(test);
            } else {
                await executeTestSuite_(test, currentContext, driver, skippingTests);
            }
        }
    } else {
        console.log(`Unimplemented test: ${currentContext}`);
        unimplementedTests.push({
            name: currentContext,
            ...testSuite.tests
        });
    }

    for (const teardown of teardowns) {
        await executeTestSuite_(teardown, currentContext, driver, skippingTests);
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
    for (const log of logs) {
        console.log(log);
    }
    if (logs.length === 0 && testFailCount === 0) {
        console.log("E2E testing passed");
    } else {
        console.log(`E2E testing failed, only ${testCount - testFailCount}/${testCount} tests passed`);
    }


    if (DISPLAY_PRIORITY_ITEMS !== 0) {
        const remainingItems = unimplementedTests.sort((a, b) => {
            if (a.priority < b.priority) {
                return -1;
            } else if (a.priority > b.priority) {
                return 1;
            } else {
                return 0;
            }
        }).slice(0, DISPLAY_PRIORITY_ITEMS).reverse();
        console.log("Priority items remaining to work on: ", remainingItems);
    }
    await killServer();
}