import { createNewTaggableService, deleteTaggableService, modifyTaggableService } from "../../functionality/taggables-functionality.js";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_TAGGABLE_SERVICE_1 = "TEST TAGGABLE SERVICE";
const TEST_TAGGABLE_SERVICE_1_OTHER_NAME = "TEST TAGGABLE SERVICE OTHER NAME";

/** @type {TestSuite[]} */
export const TAGGABLES_TESTS = [
    {name: "UsingTaggableService", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await createNewTaggableService(driver, TEST_TAGGABLE_SERVICE_1);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteTaggableService(driver, TEST_TAGGABLE_SERVICE_1);
        }},
        {name: "ModifyTaggableService", tests: async (driver) => {
            await modifyTaggableService(driver, TEST_TAGGABLE_SERVICE_1, {name: TEST_TAGGABLE_SERVICE_1_OTHER_NAME});
            await modifyTaggableService(driver, TEST_TAGGABLE_SERVICE_1_OTHER_NAME, {name: TEST_TAGGABLE_SERVICE_1});
        }},
    ]}
];