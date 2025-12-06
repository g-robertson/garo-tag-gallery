import {By } from "selenium-webdriver";
import path from "path";
import { closeModal, UNTIL_JOB_BEGIN, UNTIL_JOB_END, xpathHelper } from "../helpers.js";
import { navigateToHydrusImport } from "../navigation/file-navigation.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */
/** @import {TestSuite} from "./test-suites.js" */

const CREATE_HYDRUS_JOB_TIMEOUT = 1000;
const FINISH_HYDRUS_JOB_TIMEOUT = 5000;


/** @type {TestSuite[]} */
export const POPULATE_DATA_TESTS = [
    {name: "HydrusImport", tests: async (driver) => {
        await navigateToHydrusImport(driver);
        await driver.findElement(By.name("partialFiles")).sendKeys(path.resolve("./e2etest/data/hydrus-import.zip"));
        await driver.findElement(xpathHelper({type: "input", hasValue: "Submit"})).click();
        await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
        await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
        await closeModal(driver);
    }}
];