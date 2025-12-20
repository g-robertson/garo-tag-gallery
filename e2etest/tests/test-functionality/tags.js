import { createNewTagService, deleteTagService, modifyTagService } from "../../functionality/tags-functionality.js";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_TAG_SERVICE_1 = "TEST TAG SERVICE";
const TEST_TAG_SERVICE_1_OTHER_NAME = "TEST TAG SERVICE OTHER NAME";

/** @type {TestSuite[]} */
export const TAGS_TESTS = [
    {name: "UsingTagService", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await createNewTagService(driver, TEST_TAG_SERVICE_1);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteTagService(driver, TEST_TAG_SERVICE_1);
        }},
        {name: "ModifyTagService", tests: async (driver) => {
            await modifyTagService(driver, TEST_TAG_SERVICE_1, {name: TEST_TAG_SERVICE_1_OTHER_NAME});
            await modifyTagService(driver, TEST_TAG_SERVICE_1_OTHER_NAME, {name: TEST_TAG_SERVICE_1});
        }},
    ]}
];