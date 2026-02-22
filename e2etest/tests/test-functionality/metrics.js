import { until } from "selenium-webdriver";
import { createNewFileSearchPage, modifyTaggables } from "../../functionality/pages/file-search-pages-functionality.js";
import { BY_THUMBNAIL_GALLERY_IMAGE, ByMultiSelectOption, closeModal, closePage, DEFAULT_TIMEOUT_TIME, doubleClick, findThumbnailGalleryImage, untilCountElementsLocated, untilElementsNotLocated, xpathHelper } from "../../helpers.js";
import { changeTagToMetric, createNewMetric, createNewMetricService, deleteMetric, deleteMetricService, METRIC_TYPES, modifyMetric, modifyMetricService } from "../../functionality/metrics-functionality.js";
import { navigateToChangeTagToMetric } from "../../navigation/metrics-navigation.js";
import { BUG_IMPACTS, BUG_NOTICES, BUG_PRIORITIES, IMPLEMENTATION_DIFFICULTIES } from "../../unimplemented-test-info.js";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_METRIC_SERVICE_1 = "TEST METRIC SERVICE";
const TEST_METRIC_SERVICE_1_OTHER_NAME = "TEST METRIC SERVICE OTHER NAME";
const TEST_METRIC_1_NAME = "TEST RATING";
const TEST_METRIC_1_OTHER_NAME = "TEST RATING OTHER NAME";
const TEST_METRIC_2_NAME = "OTHER RATING";
const METRIC_TAG_TO_CONVERT = "TEST TAG";
const TEST_TAG = "1girl";

/** @type {TestSuite[]} */
export const METRICS_TESTS = [
    {name: "UsingMetricService", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await createNewMetricService(driver, TEST_METRIC_SERVICE_1);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteMetricService(driver, TEST_METRIC_SERVICE_1);
        }},
        {name: "ModifyMetricService", tests: async (driver) => {
            await modifyMetricService(driver, TEST_METRIC_SERVICE_1, {name: TEST_METRIC_SERVICE_1_OTHER_NAME});
            await modifyMetricService(driver, TEST_METRIC_SERVICE_1_OTHER_NAME, {name: TEST_METRIC_SERVICE_1});
        }},
        {name: "UsingMetrics", tests: [
            {name: "Setup", isSetup: true, tests: async (driver) => {
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
                await deleteMetric(driver, TEST_METRIC_SERVICE_1, TEST_METRIC_1_NAME);
                await deleteMetric(driver, TEST_METRIC_SERVICE_1, TEST_METRIC_2_NAME);
            }},
            {name: "ModifyMetric", tests: async (driver) => {
                await modifyMetric(driver, TEST_METRIC_SERVICE_1, TEST_METRIC_1_NAME, {
                    metricName: TEST_METRIC_1_OTHER_NAME,
                    lowerBound: -1500,
                    upperBound: 30,
                    precision: 3,
                    type: METRIC_TYPES.NUMERIC,
                });
                await modifyMetric(driver, TEST_METRIC_SERVICE_1, TEST_METRIC_1_OTHER_NAME, {
                    metricName: TEST_METRIC_1_OTHER_NAME,
                    lowerBound: 0,
                    upperBound: 10,
                    type: METRIC_TYPES.STARS,
                });
            }},
            {name: "ChangeTagToMetric", tests: [
                {name: "Setup", isSetup: true, tests: async (driver) => {
                    await createNewFileSearchPage(driver);
                    await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                    const image0 = await findThumbnailGalleryImage(driver, 0);
                    await image0.click()
                    await modifyTaggables(driver, {addTagsNoConfirm: [METRIC_TAG_TO_CONVERT]});
                }},
                {name: "Teardown", isTeardown: true, tests: async (driver) => {
                    await closePage(driver);
                }},
                {name: "ChangeTagToMetricWorks", tests: async (driver) => {
                    await changeTagToMetric(driver, METRIC_TAG_TO_CONVERT, TEST_METRIC_SERVICE_1, TEST_METRIC_1_NAME, 5, false);
                    const image0 = await findThumbnailGalleryImage(driver, 0);
                    await doubleClick(driver, image0);
                    await driver.wait(untilCountElementsLocated(xpathHelper({attrContains: {"class": ["metric-star", "selected"]}}), 5), DEFAULT_TIMEOUT_TIME);
                    await closeModal(driver);
                }},
                {name: "ChangeTagToMetricTagServiceSelectorWorks", tests: async (driver) => {
                    await navigateToChangeTagToMetric(driver);

                    await driver.findElement(ByMultiSelectOption("Default local tags", {ancestorWithClass: "change-tag-to-metric-modal"})).click();
                    await driver.wait(untilElementsNotLocated(xpathHelper({attrContains: {"class": "tag-to-metric-modal"}, descendent: {attrEq: {"title": TEST_TAG}}})), DEFAULT_TIMEOUT_TIME);
                    await driver.findElement(ByMultiSelectOption("Default local tags", {ancestorWithClass: "change-tag-to-metric-modal"})).click();
                    await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "tag-to-metric-modal"}, descendent: {attrEq: {"title": TEST_TAG}}})), DEFAULT_TIMEOUT_TIME);
                    await closeModal(driver);
                }}
            ]}
        ]}
    ]}
];