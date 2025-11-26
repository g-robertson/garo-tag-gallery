import { By, until } from "selenium-webdriver";
import { deleteBackupedFiles, killServer, spawnServer } from "../server.js";
import { authenticate } from "./authenticate.js";
import { BY_THUMBNAIL_GALLERY_IMAGE, BySearchQueryTagService, BySearchTag, BySelectableTag, closeModal, closePage, DEFAULT_TIMEOUT_TIME, deleteDatabaseDefaults, doubleClick, findThumbnailGalleryImage, findThumbnailGalleryImages, readDownloadedFile, referenceDownloadedFile, rmDownloadedFile, UNTIL_GALLERY_OPEN, UNTIL_JOB_BEGIN, UNTIL_JOB_END, UNTIL_MODAL_OPEN, untilCountElementsLocated, untilElementsNotLocated, xpathHelper } from "../helpers.js";
import { createBackupAsFile, createBackupAsText, importMappingsFromBackupFile } from "../functionality/file-functionality.js";
import { applyTagFilter, assignMetricStar, createNewFileSearchPage, fileSearchMetricTag, fileSearchSelectQueriedTag, fileSearchSelectTag, generateHasMetricComparisonGTETagName, generateHasMetricComparisonGTTagName, generateHasMetricComparisonLTETagName, generateHasMetricComparisonLTTagName, generateHasMetricInMetricServiceTagName, generateHasMetricTagName, hoverMetricStar, METRIC_TAG_SEARCH_TYPES, toggleExcludeCheckbox } from "../functionality/pages-functionality.js";
import { createNewTagService, deleteTagService, modifyTagService } from "../functionality/tags-functionality.js";
import { createNewMetric, createNewMetricService, deleteMetricService, METRIC_TYPES } from "../functionality/metrics-functionality.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */
/** @import {TestSuite} from "./test-suites.js" */

/** @type {TestSuite[]} */
const BACKUP_TESTS = [
    {name: "BackupEqualsImportBackup", tests: async (driver) => {
        const backupOriginalFile = await createBackupAsFile(driver);
        const backupOriginal = await readDownloadedFile(backupOriginalFile);
    
        await killServer();
        await deleteBackupedFiles();
        const accessKey = await spawnServer();
        await authenticate(driver, process.env.PORT, accessKey);
        await deleteDatabaseDefaults(driver);
    
        await importMappingsFromBackupFile(driver, referenceDownloadedFile(backupOriginalFile));
        await driver.wait(UNTIL_JOB_BEGIN);
        await closeModal(driver);
        await driver.wait(UNTIL_JOB_END);
        
        const backupPostBackup = await createBackupAsText(driver);
        if (backupOriginal.length !== backupPostBackup.length) {
            throw "Original backup does not match backup generated after loading from backup";
        }
    }},
]

/** @type {Record<string, any>} */
const State = {};

const TEST_TAG_SERVICE_NAME_1 = "TEST TAG SERVICE";
const TEST_TAG_SERVICE_RENAME_1 = "TAG SERVICE RENAMED";
const TEST_TAG_1 = "1girl";
const TEST_TAG_2 = "meta:highres";
const TEST_TAG_3 = "solo";
const TEST_TAG_4 = "meta:spoilers";
const TEST_TAG_5 = "meta:commentary";

const TEST_METRIC_SERVICE_1 = "TEST METRIC SERVICE";
const TEST_METRIC_SERVICE_2 = "OTHER METRIC SERVICE";
const TEST_METRIC_1_NAME = "TEST RATING";
const TEST_METRIC_2_NAME = "OTHER METRIC";

/** @type {TestSuite[]} */
const FILE_SEARCH_PAGE_TESTS = [
    {name: "Setup", isSetup: true, tests: async (driver) => {
        await createNewFileSearchPage(driver);
    }},
    {name: "Teardown", isTeardown: true, tests: async (driver) => {
        await closePage(driver);
    }},
    {name: "MultipartTest", tests: [
        {name: "CreateTagServiceUpdatesSearchQuery", tests: async (driver) => {
            await createNewTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await driver.wait(until.elementLocated(BySearchQueryTagService(TEST_TAG_SERVICE_NAME_1)), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "ModifyTagServiceUpdatesSearchQuery", tests: async (driver) => {
            await modifyTagService(driver, TEST_TAG_SERVICE_NAME_1, {name: TEST_TAG_SERVICE_RENAME_1});
            await driver.wait(until.elementLocated(BySearchQueryTagService(TEST_TAG_SERVICE_RENAME_1)), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "DeleteTagServiceUpdatesSearchQuery", tests: async (driver) => {
            await deleteTagService(driver, TEST_TAG_SERVICE_RENAME_1);
            await driver.wait(untilElementsNotLocated(BySearchQueryTagService(TEST_TAG_SERVICE_RENAME_1)), DEFAULT_TIMEOUT_TIME);
        }}
    ]},
    {name: "TagSearch", tests: [
        {name: "TagSelectionUpdatesSearchQuery", tests: async (driver) => {
            // Search query
            await fileSearchSelectTag(driver, TEST_TAG_1);
            // implement limit tag, then finish search query testing by checking if all images have tag here
            await fileSearchSelectTag(driver, TEST_TAG_2);
            await fileSearchSelectTag(driver, TEST_TAG_3);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_2)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_3)), DEFAULT_TIMEOUT_TIME);
            await fileSearchSelectTag(driver, TEST_TAG_1);
            await fileSearchSelectTag(driver, TEST_TAG_2);
            await fileSearchSelectTag(driver, TEST_TAG_3);
            await driver.wait(untilElementsNotLocated(BySearchTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(untilElementsNotLocated(BySearchTag(TEST_TAG_2)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(untilElementsNotLocated(BySearchTag(TEST_TAG_3)), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "ExclusionCheckboxExcludesTag", tests: async (driver) => {
            // selecting negates
            await toggleExcludeCheckbox(driver);
            await fileSearchSelectTag(driver, TEST_TAG_1);
            await driver.wait(until.elementLocated(BySearchTag(`-${TEST_TAG_1}`)), DEFAULT_TIMEOUT_TIME);
            await fileSearchSelectQueriedTag(driver, `-${TEST_TAG_1}`);
            await driver.wait(untilElementsNotLocated(BySearchTag(`-${TEST_TAG_1}`)), DEFAULT_TIMEOUT_TIME);
            
            // deselecting makes not negated
            await toggleExcludeCheckbox(driver);
            await fileSearchSelectTag(driver, TEST_TAG_4);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_4)), DEFAULT_TIMEOUT_TIME);
            await fileSearchSelectTag(driver, TEST_TAG_4);
        }},
        {name: "TagFilterFilters", tests: async (driver) => {
            await applyTagFilter(driver, TEST_TAG_4);
            await driver.wait(untilElementsNotLocated(BySelectableTag(TEST_TAG_5)), DEFAULT_TIMEOUT_TIME);
            await applyTagFilter(driver, "");
            await driver.wait(until.elementsLocated(BySelectableTag(TEST_TAG_5)), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "MetricTag", tests: [
            {name: "Setup", tests: async (driver) => {
                await createNewMetricService(driver, TEST_METRIC_SERVICE_1);
                await createNewMetric(driver, {
                    metricServiceName: TEST_METRIC_SERVICE_1,
                    metricName: TEST_METRIC_1_NAME,
                    lowerBound: 0,
                    upperBound: 10,
                    type: METRIC_TYPES.STARS
                });
                await createNewMetricService(driver, TEST_METRIC_SERVICE_2);
                await createNewMetric(driver, {
                    metricServiceName: TEST_METRIC_SERVICE_2,
                    metricName: TEST_METRIC_2_NAME,
                    lowerBound: 0,
                    upperBound: 10,
                    type: METRIC_TYPES.STARS
                });
                
                const image0 = await findThumbnailGalleryImage(driver, 0);
                State.image0Title = await image0.getAttribute("title");
                await doubleClick(driver, image0);
                await driver.wait(UNTIL_GALLERY_OPEN, DEFAULT_TIMEOUT_TIME);
                await assignMetricStar(driver, TEST_METRIC_2_NAME, 4);
                await closeModal(driver);

                const image1 = await findThumbnailGalleryImage(driver, 1);
                State.image1Title = await image1.getAttribute("title");
                await doubleClick(driver, image1);
                await driver.wait(UNTIL_GALLERY_OPEN, DEFAULT_TIMEOUT_TIME);
                await assignMetricStar(driver, TEST_METRIC_2_NAME, 5);
                await closeModal(driver);

                const image2 = await findThumbnailGalleryImage(driver, 2);
                State.image2Title = await image2.getAttribute("title");
                await doubleClick(driver, image2);
                await driver.wait(UNTIL_GALLERY_OPEN, DEFAULT_TIMEOUT_TIME);
                await assignMetricStar(driver, TEST_METRIC_1_NAME, 2);
                await closeModal(driver);

            }},
            {name: "Teardown", isTeardown: true, tests: async (driver) => {
                await deleteMetricService(driver, TEST_METRIC_SERVICE_1);
                await deleteMetricService(driver, TEST_METRIC_SERVICE_2);
            }},
            {name: "HasMetric", tests: async (driver) => {
                //Image0 -> METRIC_2:4
                //Image1 -> METRIC_2:5
                //Image2 -> METRIC_1:2
                const expectedGalleryImages = new Set([State.image2Title]);
                await fileSearchMetricTag(driver, TEST_METRIC_SERVICE_1, TEST_METRIC_1_NAME, METRIC_TAG_SEARCH_TYPES.HAS_METRIC);
                await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                const galleryImages = await findThumbnailGalleryImages(driver);
                if (galleryImages.length !== expectedGalleryImages.size) {
                    throw `Found an unexpected number of gallery images (${galleryImages.length}) != ${expectedGalleryImages.size} from metric tag`
                }
                for (const galleryImage of galleryImages) {
                    if (!expectedGalleryImages.has(await galleryImage.getAttribute("title"))) {
                        throw "Found an unexpected gallery image from metric tag";
                    }
                }
                await fileSearchSelectQueriedTag(driver, generateHasMetricTagName(TEST_METRIC_1_NAME));
            }},
            {name: "HasMetricInMetricService", tests: async (driver) => {
                //Image0 -> METRIC_2:4
                //Image1 -> METRIC_2:5
                //Image2 -> METRIC_1:2
                const expectedGalleryImages = new Set([State.image2Title]);
                await fileSearchMetricTag(driver, TEST_METRIC_SERVICE_1, TEST_METRIC_1_NAME, METRIC_TAG_SEARCH_TYPES.HAS_METRIC_IN_METRIC_SERVICE);
                await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                const galleryImages = await findThumbnailGalleryImages(driver);
                if (galleryImages.length !== expectedGalleryImages.size) {
                    throw `Found an unexpected number of gallery images (${galleryImages.length}) != ${expectedGalleryImages.size} from metric tag`
                }
                for (const galleryImage of galleryImages) {
                    if (!expectedGalleryImages.has(await galleryImage.getAttribute("title"))) {
                        throw "Found an unexpected gallery image from metric tag";
                    }
                }
                await fileSearchSelectQueriedTag(driver, generateHasMetricInMetricServiceTagName(TEST_METRIC_SERVICE_1));
            }},
            {name: "HasMetricLT", tests: async (driver) => {
                //Image0 -> METRIC_2:4
                //Image1 -> METRIC_2:5
                //Image2 -> METRIC_1:2
                // Testing Has Metric <
                const expectedGalleryImages = new Set([State.image0Title]);
                await fileSearchMetricTag(driver, TEST_METRIC_SERVICE_2, TEST_METRIC_2_NAME, METRIC_TAG_SEARCH_TYPES.METRIC_LT, 5);
                await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                const galleryImages = await findThumbnailGalleryImages(driver);
                if (galleryImages.length !== expectedGalleryImages.size) {
                    throw `Found an unexpected number of gallery images (${galleryImages.length}) != ${expectedGalleryImages.size} from metric tag`
                }
                for (const galleryImage of galleryImages) {
                    if (!expectedGalleryImages.has(await galleryImage.getAttribute("title"))) {
                        throw "Found an unexpected gallery image from metric tag";
                    }
                }
                await fileSearchSelectQueriedTag(driver, generateHasMetricComparisonLTTagName(TEST_METRIC_2_NAME, 5));
            }},
            {name: "HasMetricLTE", tests: async (driver) => {
                //Image0 -> METRIC_2:4
                //Image1 -> METRIC_2:5
                //Image2 -> METRIC_1:2
                // Testing Has Metric <=
                const expectedGalleryImages = new Set([State.image0Title, State.image1Title]);
                await fileSearchMetricTag(driver, TEST_METRIC_SERVICE_2, TEST_METRIC_2_NAME, METRIC_TAG_SEARCH_TYPES.METRIC_LTE, 5);
                await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                const galleryImages = await findThumbnailGalleryImages(driver);
                if (galleryImages.length !== expectedGalleryImages.size) {
                    throw `Found an unexpected number of gallery images (${galleryImages.length}) != ${expectedGalleryImages.size} from metric tag`
                }
                for (const galleryImage of galleryImages) {
                    if (!expectedGalleryImages.has(await galleryImage.getAttribute("title"))) {
                        throw "Found an unexpected gallery image from metric tag";
                    }
                }
                await fileSearchSelectQueriedTag(driver, generateHasMetricComparisonLTETagName(TEST_METRIC_2_NAME, 5));
            }},
            {name: "HasMetricGT", tests: async (driver) => {
                //Image0 -> METRIC_2:4
                //Image1 -> METRIC_2:5
                //Image2 -> METRIC_1:2
                // Testing Has Metric >
                const expectedGalleryImages = new Set([State.image1Title]);
                await fileSearchMetricTag(driver, TEST_METRIC_SERVICE_2, TEST_METRIC_2_NAME, METRIC_TAG_SEARCH_TYPES.METRIC_GT, 4);
                await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                const galleryImages = await findThumbnailGalleryImages(driver);
                if (galleryImages.length !== expectedGalleryImages.size) {
                    throw `Found an unexpected number of gallery images (${galleryImages.length}) != ${expectedGalleryImages.size} from metric tag`
                }
                for (const galleryImage of galleryImages) {
                    if (!expectedGalleryImages.has(await galleryImage.getAttribute("title"))) {
                        throw "Found an unexpected gallery image from metric tag";
                    }
                }
                await fileSearchSelectQueriedTag(driver, generateHasMetricComparisonGTTagName(TEST_METRIC_2_NAME, 4));
            }},
            {name: "HasMetricGTE", tests: async (driver) => {
                //Image0 -> METRIC_2:4
                //Image1 -> METRIC_2:5
                //Image2 -> METRIC_1:2
                // Testing Has Metric >=
                const expectedGalleryImages = new Set([State.image0Title, State.image1Title]);
                await fileSearchMetricTag(driver, TEST_METRIC_SERVICE_2, TEST_METRIC_2_NAME, METRIC_TAG_SEARCH_TYPES.METRIC_GTE, 4);
                await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
                const galleryImages = await findThumbnailGalleryImages(driver);
                if (galleryImages.length !== expectedGalleryImages.size) {
                    throw `Found an unexpected number of gallery images (${galleryImages.length}) != ${expectedGalleryImages.size} from metric tag`
                }
                for (const galleryImage of galleryImages) {
                    if (!expectedGalleryImages.has(await galleryImage.getAttribute("title"))) {
                        throw "Found an unexpected gallery image from metric tag";
                    }
                }
                await fileSearchSelectQueriedTag(driver, generateHasMetricComparisonGTETagName(TEST_METRIC_2_NAME, 4));
            }}
        ]}
    ]},
    {name: "Gallery", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            const TEST_METRIC_SERVICE_1 = "TEST METRIC SERVICE";
            await createNewMetricService(driver, TEST_METRIC_SERVICE_1);
            const TEST_METRIC_1_NAME = "TEST RATING";
            await createNewMetric(driver, {
                metricServiceName: TEST_METRIC_SERVICE_1,
                metricName: TEST_METRIC_1_NAME,
                lowerBound: 0,
                upperBound: 10,
                type: METRIC_TYPES.STARS
            });
            const TEST_METRIC_SERVICE_2 = "OTHER METRIC SERVICE";
            await createNewMetricService(driver, TEST_METRIC_SERVICE_2);
            const TEST_METRIC_2_NAME = "OTHER METRIC"
            await createNewMetric(driver, {
                metricServiceName: TEST_METRIC_SERVICE_2,
                metricName: TEST_METRIC_2_NAME,
                lowerBound: 0,
                upperBound: 10,
                type: METRIC_TYPES.STARS
            });
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteMetricService(driver, TEST_METRIC_SERVICE_1);
            await deleteMetricService(driver, TEST_METRIC_SERVICE_2);
        }},
        {name: "DoMetricStarsWork", tests: async (driver) => {
            const image0 = await findThumbnailGalleryImage(driver, 0);
            await doubleClick(driver, image0);
            await driver.wait(UNTIL_GALLERY_OPEN, DEFAULT_TIMEOUT_TIME);
            await hoverMetricStar(driver, TEST_METRIC_1_NAME, 5);
            await driver.wait(untilCountElementsLocated(xpathHelper({containsClass: ["metric-star", "hovered"]}), 5), DEFAULT_TIMEOUT_TIME);
            await assignMetricStar(driver, TEST_METRIC_2_NAME, 4);
            await driver.wait(untilCountElementsLocated(xpathHelper({containsClass: ["metric-star", "selected", "hovered"]}), 4), DEFAULT_TIMEOUT_TIME);
            await hoverMetricStar(driver, TEST_METRIC_1_NAME, 7);
            await driver.wait(untilCountElementsLocated(xpathHelper({containsClass: ["metric-star", "hovered"]}), 7), DEFAULT_TIMEOUT_TIME);
            await driver.wait(untilCountElementsLocated(xpathHelper({containsClass: ["metric-star", "selected"]}), 4), DEFAULT_TIMEOUT_TIME);
            await closeModal(driver);
        }}
    ]},
]

/** @type {TestSuite[]} */
const PAGES_TEST = [
    {name: "FileSearchPage", tests: FILE_SEARCH_PAGE_TESTS}
]



/** @type {TestSuite[]} */
export const FUNCTIONAL_TESTS = [
    {name: "Backup", tests: BACKUP_TESTS},
    {name: "Pages", tests: PAGES_TEST},
];