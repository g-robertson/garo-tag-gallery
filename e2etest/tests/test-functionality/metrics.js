import { until } from "selenium-webdriver";
import { applyTagFilter, createNewFileSearchPage, enterTagFilter, selectTagFromLocalTagSelector, modifyTaggables } from "../../functionality/pages-functionality.js";
import { ByMultiSelectOption, closeModal, DEFAULT_TIMEOUT_TIME, doubleClick, findThumbnailGalleryImage, untilCountElementsLocated, untilElementsNotLocated, xpathHelper } from "../../helpers.js";
import { changeTagToMetric, createNewMetric, createNewMetricService, deleteMetricService, METRIC_TYPES } from "../../functionality/metrics-functionality.js";
import { navigateToChangeTagToMetric } from "../../navigation/metrics-navigation.js";
import { BUG_IMPACTS, BUG_NOTICES, BUG_PRIORITIES, IMPLEMENTATION_DIFFICULTIES } from "../../unimplemented-test-info.js";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_METRIC_SERVICE_1 = "TEST METRIC SERVICE";
const TEST_METRIC_1_NAME = "TEST RATING";
const TEST_METRIC_2_NAME = "OTHER RATING";
const METRIC_TAG_TO_CONVERT = "TEST TAG";
const TEST_TAG = "1girl";

/** @type {TestSuite[]} */
export const METRICS_TESTS = [
    {name: "Setup", isSetup: true, tests: async (driver) => {
        await createNewFileSearchPage(driver);
        await createNewMetricService(driver, TEST_METRIC_SERVICE_1);
        await createNewMetric(driver, {
            metricServiceName: TEST_METRIC_SERVICE_1,
            metricName: TEST_METRIC_1_NAME,
            lowerBound: 0,
            upperBound: 10,
            type: METRIC_TYPES.STARS
        });
        await createNewMetric(driver, {
            metricServiceName: TEST_METRIC_SERVICE_1,
            metricName: TEST_METRIC_2_NAME,
            lowerBound: 0,
            upperBound: 10,
            type: METRIC_TYPES.STARS
        });
    }},
    {name: "Teardown", isTeardown: true, tests: async (driver) => {
        await deleteMetricService(driver, TEST_METRIC_SERVICE_1);
    }},
    {name: "RestOfFunctions", tests: {
        priority: BUG_PRIORITIES.NEXT_WORK,
        notice: BUG_NOTICES.ASSUMED_WORKING,
        impact: BUG_IMPACTS.ASSUMED_WORKING,
        expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY
    }},
    {name: "ChangeTagToMetric", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            const image0 = await findThumbnailGalleryImage(driver, 0);
            await image0.click()
            await modifyTaggables(driver, {addTagsNoConfirm: [METRIC_TAG_TO_CONVERT]});
        }},
        {name: "ChangeTagToMetricWorks", tests: async (driver) => {
            await changeTagToMetric(driver, METRIC_TAG_TO_CONVERT, TEST_METRIC_SERVICE_1, TEST_METRIC_1_NAME, 5, false);
            const image0 = await findThumbnailGalleryImage(driver, 0);
            await doubleClick(driver, image0);
            await driver.wait(untilCountElementsLocated(xpathHelper({containsClass: ["metric-star", "selected"]}), 5), DEFAULT_TIMEOUT_TIME);
            await closeModal(driver);
        }},
        {name: "ChangeTagToMetricTagServiceSelectorWorks", tests: async (driver) => {
            await navigateToChangeTagToMetric(driver);

            const defaultLocalTagsElement = driver.findElement(ByMultiSelectOption("Default local tags", {ancestorWithClass: "change-tag-to-metric-modal"}));
            await defaultLocalTagsElement.click();
            await driver.wait(untilElementsNotLocated(xpathHelper({containsClass: "tag-to-metric-modal", descendent: {hasTitle: TEST_TAG}})), DEFAULT_TIMEOUT_TIME);
            await defaultLocalTagsElement.click();
            await driver.wait(until.elementLocated(xpathHelper({containsClass: "tag-to-metric-modal", descendent: {hasTitle: TEST_TAG}})), DEFAULT_TIMEOUT_TIME);
            await closeModal(driver);
        }}
    ]}
];