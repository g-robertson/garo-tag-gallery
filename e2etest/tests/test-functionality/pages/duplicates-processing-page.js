import { Key, until } from "selenium-webdriver";
import { adjustDuplicateSearchDistance, applyTagFilter, beginDatabaseProcessingFiles, beginFilteringPotentialDuplicates, commitDuplicates, commitDuplicatesFromDialog, createNewDuplicatesProcessingPage, createNewFileSearchPage, duplicateAlternates, duplicateCurrentIsBetter, duplicateCurrentIsBetterTrashOther, duplicateDiscardUncommitted, duplicateFalsePositive, duplicateGoBack, duplicateSameQuality, duplicateSameQualityTrashLarger, duplicateSkip, selectTagFromLocalTagSelector, selectTagFromTagSearchQuery } from "../../../functionality/pages-functionality.js";
import { BY_DEDUPE_PREVIEW_GALLERY_IMAGE, BY_THUMBNAIL_GALLERY_IMAGE, closeModal, closePage, DEFAULT_TIMEOUT_TIME, doubleClick, findDedupeGalleryImage, findDedupePreviewGalleryImage, findDedupePreviewGalleryImages, modClick, scroll, selectPage, sendKeys, UNTIL_JOB_BEGIN, UNTIL_JOB_END, untilCountElementsLocated, untilElementsNotLocated, xpathHelper } from "../../../helpers.js";
import { BUG_IMPACTS, BUG_NOTICES, BUG_PRIORITIES, IMPLEMENTATION_DIFFICULTIES } from "../../../unimplemented-test-info.js";
import { importFilesFromHydrus } from "../../../functionality/file-functionality.js";
/** @import {TestSuite} from "../../test-suites.js" */


/** @type {Record<string, any>} */
const State = {};

const TEST_TAG_1_PAIR = "blue kimono";
const TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER = "current-is-better-trash-other-test";
const TEST_TAG_CURRENT_IS_BETTER = "current-is-better-test";
const TEST_TAG_SAME_QUALITY_TRASH_LARGER = "same-quality-trash-larger-test";
const TEST_TAG_SAME_QUALITY = "same-quality-test";
const TEST_TAG_ALTERNATE = "alternate-test";
const TEST_TAG_FALSE_POSITIVE = "false-positive-test";

/** @type {TestSuite[]} */
export const DUPLICATES_PROCESSING_PAGE_TESTS = [
    {name: "Setup", isSetup: true, tests: async (driver) => {
        await importFilesFromHydrus(driver, {fileName: "./e2etest/data/hydrus-duplicates-test.zip"});
        await driver.wait(UNTIL_JOB_BEGIN, DEFAULT_TIMEOUT_TIME);
        await driver.wait(UNTIL_JOB_END, 10000);
        await createNewDuplicatesProcessingPage(driver);
        await createNewFileSearchPage(driver);
        await selectPage(driver, 0);
    }},
    {name: "Teardown", isTeardown: true, tests: async (driver) => {
        await closePage(driver);
        await closePage(driver);
    }},
    {name: "WithDuplicateProcessedFiles", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await beginDatabaseProcessingFiles(driver);
            await driver.wait(UNTIL_JOB_BEGIN, DEFAULT_TIMEOUT_TIME);
            await driver.wait(UNTIL_JOB_END, 10000);
            await driver.wait(until.elementLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);
        }},
        // Need to develop an admin tool for resetting p-hashes and an admin tool for deleting all file relations
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
            {name: "DedupeGalleryShouldTrashCurrentIsBetterTrashOther", tests: async (driver) => {
                await applyTagFilter(driver, TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateCurrentIsBetterTrashOther(driver);
                await commitDuplicatesFromDialog(driver);

                await driver.wait(untilElementsNotLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER);

                await selectPage(driver, 1);
                await applyTagFilter(driver, TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER);
                await driver.wait(untilCountElementsLocated(BY_THUMBNAIL_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await selectTagFromTagSearchQuery(driver, TEST_TAG_CURRENT_IS_BETTER_TRASH_OTHER);
                await selectPage(driver, 0);
            }},
            {name: "DedupeGalleryShouldRemoveCurrentIsBetterFromPotentialsPending", tests: async (driver) => {
                await applyTagFilter(driver, TEST_TAG_CURRENT_IS_BETTER);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_CURRENT_IS_BETTER);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateCurrentIsBetter(driver);
                await commitDuplicatesFromDialog(driver);

                await driver.wait(untilElementsNotLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_CURRENT_IS_BETTER);
            }},
            {name: "DedupeGalleryShouldTrashSameQualityTrashLarger", tests: async (driver) => {
                await applyTagFilter(driver, TEST_TAG_SAME_QUALITY_TRASH_LARGER);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_SAME_QUALITY_TRASH_LARGER);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateSameQualityTrashLarger(driver);
                await commitDuplicatesFromDialog(driver);

                await driver.wait(untilElementsNotLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_SAME_QUALITY_TRASH_LARGER);
            }},
            {name: "DedupeGalleryShouldRemoveSameQualityFromPotentialsPending", tests: async (driver) => {
                await applyTagFilter(driver, TEST_TAG_SAME_QUALITY);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_SAME_QUALITY);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateSameQuality(driver);
                await commitDuplicatesFromDialog(driver);

                await driver.wait(untilElementsNotLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_SAME_QUALITY);
            }},
            {name: "DedupeGalleryShouldRemoveAlternatesFromPotentialsPending", tests: async (driver) => {
                await applyTagFilter(driver, TEST_TAG_ALTERNATE);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_ALTERNATE);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateAlternates(driver);
                await commitDuplicatesFromDialog(driver);

                await driver.wait(untilElementsNotLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_ALTERNATE);
            }},
            {name: "DedupeGalleryShouldRemoveFalsePositivesFromPotentialsPending", tests: async (driver) => {
                await applyTagFilter(driver, TEST_TAG_FALSE_POSITIVE);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_FALSE_POSITIVE);
                await driver.wait(untilCountElementsLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE, 1), DEFAULT_TIMEOUT_TIME);
                await beginFilteringPotentialDuplicates(driver);
                await duplicateFalsePositive(driver);
                await commitDuplicatesFromDialog(driver);

                await driver.wait(untilElementsNotLocated(BY_DEDUPE_PREVIEW_GALLERY_IMAGE), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, TEST_TAG_FALSE_POSITIVE);
            }},
            {name: "DedupeGalleryDuplicateIsTransitive", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.PARTIALLY_UNUSABLE,
                noticeability: BUG_NOTICES.MINOR
            }},
            {name: "DedupeGalleryAlternateIsTransitive", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.PARTIALLY_UNUSABLE,
                noticeability: BUG_NOTICES.MINOR
            }},
            {name: "DedupeGalleryAlternateIsTransitiveThroughDuplicate", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.PARTIALLY_UNUSABLE,
                noticeability: BUG_NOTICES.MINOR
            }},
            {name: "DedupeGalleryTransitivityWorksThroughNonSelectedFileComparisons", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.COSMETIC,
                noticeability: BUG_NOTICES.MINOR
            }},
            {name: "DedupeGalleryTransitiveAlternatesShouldNotBeMarkedAsCompared", tests: {
                expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY,
                priority: BUG_PRIORITIES.CURRENT_WORK,
                impact: BUG_IMPACTS.COSMETIC,
                noticeability: BUG_NOTICES.MINOR
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