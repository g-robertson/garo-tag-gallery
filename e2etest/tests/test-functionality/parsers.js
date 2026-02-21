import { createNewDownloaderService, deleteDownloaderService, modifyDownloaderService } from "../../functionality/parsers-functionality.js";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_DOWNLOADER_SERVICE_1 = "TEST DOWNLOADER SERVICE";
const TEST_DOWNLOADER_SERVICE_1_OTHER_NAME = "TEST DOWNLOADER SERVICE OTHER NAME";

/** @type {TestSuite[]} */
export const TAGS_TESTS = [
    {name: "UsingDownloaderService", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await createNewDownloaderService(driver, TEST_DOWNLOADER_SERVICE_1);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteDownloaderService(driver, TEST_DOWNLOADER_SERVICE_1);
        }},
        {name: "ModifyDownloaderService", tests: async (driver) => {
            await modifyDownloaderService(driver, TEST_DOWNLOADER_SERVICE_1, {name: TEST_DOWNLOADER_SERVICE_1_OTHER_NAME});
            await modifyDownloaderService(driver, TEST_DOWNLOADER_SERVICE_1_OTHER_NAME, {name: TEST_DOWNLOADER_SERVICE_1});
        }},
    ]}
];