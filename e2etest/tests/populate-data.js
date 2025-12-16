import {By } from "selenium-webdriver";
import { CREATE_HYDRUS_JOB_TIMEOUT, FINISH_HYDRUS_JOB_TIMEOUT, UNTIL_JOB_BEGIN, UNTIL_JOB_END } from "../helpers.js";
import { importFilesFromHydrus } from "../functionality/file-functionality.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */
/** @import {TestSuite} from "./test-suites.js" */


/** @type {TestSuite[]} */
export const POPULATE_DATA_TESTS = [
    {name: "HydrusImport", tests: async (driver) => {
        await importFilesFromHydrus(driver, {fileName: "./e2etest/data/hydrus-import.zip"});
        await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
        await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
    }}
];