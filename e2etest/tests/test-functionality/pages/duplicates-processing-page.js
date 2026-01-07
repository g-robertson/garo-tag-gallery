import { Key, until } from "selenium-webdriver";
import { applyTagFilter, beginDatabaseProcessingFiles, beginFilteringPotentialDuplicates, commitDuplicates, commitDuplicatesFromDialog, createNewDuplicatesProcessingPage, duplicateDiscardUncommitted, duplicateGoBack, duplicateSkip, selectTagFromLocalTagSelector, selectTagFromTagSearchQuery } from "../../../functionality/pages-functionality.js";
import { BY_DEDUPE_PREVIEW_GALLERY_IMAGE, closeModal, closePage, DEFAULT_TIMEOUT_TIME, doubleClick, findDedupeGalleryImage, findDedupePreviewGalleryImage, findDedupePreviewGalleryImages, modClick, scroll, sendKeys, UNTIL_JOB_BEGIN, UNTIL_JOB_END, untilCountElementsLocated, xpathHelper } from "../../../helpers.js";
import { BUG_IMPACTS, BUG_NOTICES, BUG_PRIORITIES, IMPLEMENTATION_DIFFICULTIES } from "../../../unimplemented-test-info.js";
/** @import {TestSuite} from "../../test-suites.js" */


/** @type {Record<string, any>} */
const State = {};

const TEST_TAG_SERVICE_NAME_1 = "TEST TAG SERVICE";
const TEST_TAG_SERVICE_RENAME_1 = "TAG SERVICE RENAMED";
const TEST_TAG_1_PAIR = "hairclip";
const TEST_TAG_2 = "meta:highres";
const TEST_TAG_3 = "solo";
const TEST_TAG_4 = "meta:spoilers";
const TEST_TAG_5 = "meta:commentary";

const SERIES_TAG_1 = "series:toaru majutsu no index";

const TEST_METRIC_SERVICE_1 = "TEST METRIC SERVICE";
const TEST_METRIC_SERVICE_2 = "OTHER METRIC SERVICE";
const TEST_METRIC_1_NAME = "TEST RATING";
const TEST_METRIC_2_NAME = "OTHER METRIC";

/** @type {TestSuite[]} */
export const DUPLICATES_PROCESSING_PAGE_TESTS = [
    {name: "Setup", isSetup: true, tests: async (driver) => {
        await createNewDuplicatesProcessingPage(driver);
    }},
    {name: "Teardown", isTeardown: true, tests: async (driver) => {
        await closePage(driver);
    }},
    {name: "WithDuplicateProcessedFiles", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await beginDatabaseProcessingFiles(driver);
            await driver.wait(UNTIL_JOB_BEGIN, DEFAULT_TIMEOUT_TIME);
            await driver.wait(UNTIL_JOB_END, 10000);
            await driver.wait(until.elementLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
        }},
        // Need to develop an admin tool for resetting p-hashes + duplicates processed
        {name: "Teardown", isTeardown: true, tests: {
            expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
            priority: BUG_PRIORITIES.INTEND_FOR_THIS_RELEASE,
            noticeability: BUG_NOTICES.MEDIUM,
            impact: BUG_IMPACTS.DEV_IMPEDIMENT
        }},
        {name: "TestTagSearchWorks", tests: async (driver) => {
            await applyTagFilter(driver, TEST_TAG_1_PAIR);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_1_PAIR);
            await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
            await selectTagFromTagSearchQuery(driver, TEST_TAG_1_PAIR);
            await applyTagFilter(driver, "");
        }},
        {name: "AdjustingSearchDistanceWorks", tests: {
            expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
            priority: BUG_PRIORITIES.NEXT_WORK,
            impact: BUG_IMPACTS.ASSUMED_WORKING,
            noticeability: BUG_NOTICES.ASSUMED_WORKING
        }},
        {name: "SetAllSmallerExactPixelDuplicatesAsBetterWorks", tests: {
            expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
            priority: BUG_PRIORITIES.INTEND_FOR_THIS_RELEASE,
            impact: BUG_IMPACTS.UNUSABLE,
            noticeability: BUG_NOTICES.MAJOR
        }},
        {name: "DedupeGallery", tests: [
            {name: "BeginFilteringPotentialDuplicatesWorks", tests: async (driver) => {
                await beginFilteringPotentialDuplicates(driver);
                await commitDuplicates(driver);
            }},
            {name: "DedupeGalleryShouldPromptForCommitAtEnd", tests: async (driver) => {
                const images = await findDedupePreviewGalleryImages(driver);
                await images[0].click();
                await modClick(driver, images[1], {ctrl: true});
                await modClick(driver, images[2], {ctrl: true});
                await beginFilteringPotentialDuplicates(driver);

                await duplicateSkip(driver);
                await duplicateSkip(driver);
                await duplicateSkip(driver);
                await commitDuplicatesFromDialog(driver);
            }},
            {name: "DedupeGalleryShouldTrashCurrentIsBetterTrashOther", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.UNUSABLE,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryShouldRemoveCurrentIsBetterFromPotentialsPending", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.UNUSABLE,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryShouldTrashSameQualityTrashLarger", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.UNUSABLE,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryShouldRemoveSameQualityFromPotentialsPending", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.UNUSABLE,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryShouldRemoveAlternatesFromPotentialsPending", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.UNUSABLE,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryShouldRemoveFalsePositivesFromPotentialsPending", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.UNUSABLE,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGallerySkipAndGoBackShouldWork", tests: async (driver) => {
                await beginFilteringPotentialDuplicates(driver);
                await duplicateSkip(driver);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {text: "2", class: "dedupe-gallery-current-file-index"}})), DEFAULT_TIMEOUT_TIME);
                await duplicateGoBack(driver);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {text: "1", class: "dedupe-gallery-current-file-index"}})), DEFAULT_TIMEOUT_TIME);
                await commitDuplicates(driver);
            }},
            {name: "DedupeGalleryUncommittedReopenShouldWork", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.NEXT_WORK,
                impact: BUG_IMPACTS.CORRUPTS_DATA,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryUncommittedCommitShouldWork", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR,
                priority: BUG_PRIORITIES.NEXT_WORK,
                impact: BUG_IMPACTS.CORRUPTS_DATA,
                noticeability: BUG_NOTICES.MAJOR
            }},
            {name: "DedupeGalleryUncommittedDiscardShouldWork", tests: async (driver) => {
                await beginFilteringPotentialDuplicates(driver);
                await closeModal(driver);

                await applyTagFilter(driver, TEST_TAG_1_PAIR);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_1_PAIR);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateDiscardUncommitted(driver);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {text: "1", class: "dedupe-gallery-total-file-comparisons"}})), DEFAULT_TIMEOUT_TIME);
                await commitDuplicates(driver);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_1_PAIR);
                await applyTagFilter(driver, "");
            }},
            {name: "DedupeGalleryScrollShouldSwitchActiveFile", tests: async (driver) => {
                await beginFilteringPotentialDuplicates(driver);

                const originalImage = await findDedupeGalleryImage(driver);
                const originalSrc = await originalImage.getAttribute("src");
                await scroll(driver, originalImage, 1, 1);
                const afterImage = await findDedupeGalleryImage(driver);
                const afterSrc = await afterImage.getAttribute("src");
                if (originalSrc === afterSrc) {
                    throw "Source did not change after scrolling image";
                }

                await commitDuplicates(driver);
            }},
            {name: "DedupeGalleryArrowKeysShouldSwitchActiveFile", tests: async (driver) => {
                await beginFilteringPotentialDuplicates(driver);

                let image = await findDedupeGalleryImage(driver);
                let originalSrc = await image.getAttribute("src");

                await sendKeys(driver, Key.ARROW_DOWN);
                image = await findDedupeGalleryImage(driver);
                let afterSrc = await image.getAttribute("src");
                if (originalSrc === afterSrc) { throw "Source did not change after arrow-key scrolling image"; }
                
                await sendKeys(driver, Key.ARROW_UP);
                image = await findDedupeGalleryImage(driver);
                afterSrc = await image.getAttribute("src");
                if (originalSrc !== afterSrc) { throw "Source did not change after arrow-key scrolling image"; }

                await sendKeys(driver, Key.ARROW_LEFT);
                image = await findDedupeGalleryImage(driver);
                afterSrc = await image.getAttribute("src");
                if (originalSrc === afterSrc) { throw "Source did not change after arrow-key scrolling image"; }
                
                await sendKeys(driver, Key.ARROW_RIGHT);
                image = await findDedupeGalleryImage(driver);
                afterSrc = await image.getAttribute("src");
                if (originalSrc !== afterSrc) { throw "Source did not change after arrow-key scrolling image"; }

                await commitDuplicates(driver);
            }},
            {name: "DedupeGalleryShouldClubManyAlternates", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY,
                priority: BUG_PRIORITIES.INTEND_FOR_THIS_RELEASE,
                impact: BUG_IMPACTS.COSMETIC,
                noticeability: BUG_NOTICES.MEDIUM
            }}
        ]},
    ]}
]