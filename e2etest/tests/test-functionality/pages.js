import { Key, until } from "selenium-webdriver";
import { BY_THUMBNAIL_GALLERY_IMAGE, ByMultiSelectOption, ByPage, BySearchQueryTagService, BySearchTag, BySelectableTag, BySelectedTag, closeModal, closePage, DEFAULT_SLEEP_TIME, DEFAULT_TIMEOUT_TIME, doubleClick, drag, findThumbnailGalleryImage, findThumbnailGalleryImages, modClick, modDoubleClick, scroll, selectPage, sendKeys, UNTIL_GALLERY_OPEN, untilCountElementsLocated, untilCountElementsLocatedNotEquals, untilElementsNotLocated, xpathHelper } from "../../helpers.js";
import { addAggregateTag, AGGREGATE_CONDITION_TYPES, AGGREGATE_TAG_TYPES, applyTagFilter, assignMetricStar, clickModifyTaggablesButton, COMPARATORS, createNewFileSearchPage, enterTagFilter, fileSearchMetricTag, selectTagFromTagSearchQuery, selectTagFromLocalTagSelector, generateHasMetricComparisonGTETagName, generateHasMetricComparisonGTTagName, generateHasMetricComparisonLTETagName, generateHasMetricComparisonLTTagName, generateHasMetricInMetricServiceTagName, generateHasMetricTagName, hoverMetricStar, METRIC_TAG_SEARCH_TYPES, modifyTaggables, saveModifyTaggablesChanges, saveOrTag, selectOrTag, toggleExcludeCheckbox, trashTaggables } from "../../functionality/pages-functionality.js";
import { createNewTagService, deleteTagService, modifyTagService } from "../../functionality/tags-functionality.js";
import { createNewMetric, createNewMetricService, deleteMetricService, METRIC_TYPES } from "../../functionality/metrics-functionality.js";
import { BUG_PRIORITIES, BUG_NOTICES, BUG_IMPACTS, IMPLEMENTATION_DIFFICULTIES } from "../../unimplemented-test-info.js";

/** @import {TestSuite} from "../test-suites.js" */


/** @type {Record<string, any>} */
const State = {};

const TEST_TAG_SERVICE_NAME_1 = "TEST TAG SERVICE";
const TEST_TAG_SERVICE_RENAME_1 = "TAG SERVICE RENAMED";
const TEST_TAG_1 = "1girl";
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
const FILE_SEARCH_PAGE_TESTS = [
    {name: "Setup", isSetup: true, tests: async (driver) => {
        await createNewFileSearchPage(driver);
    }},
    {name: "Teardown", isTeardown: true, tests: async (driver) => {
        await closePage(driver);
    }},
    {name: "TagServiceUpdatesSearchQuery", tests: [
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
    {name: "ToggleTagServiceTogglesTags", tests: async (driver) => {
        await driver.findElement(ByMultiSelectOption("Default local tags")).click();
        await driver.wait(untilElementsNotLocated(BySelectableTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
        await driver.findElement(ByMultiSelectOption("Default local tags")).click();
        await driver.wait(until.elementsLocated(BySelectableTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
    }},
    {name: "RightClosePageButtonShouldWork", tests: async (driver) => {
        await createNewFileSearchPage(driver);
        await driver.findElement(xpathHelper({attrEq: {"class": "page-topbar-right"}, descendent: {attrEq: {"class": "page-cancel"}}})).click();
        await driver.wait(untilCountElementsLocated(ByPage, 1), DEFAULT_TIMEOUT_TIME);  
    }},
    {name: "TagSearch", tests: [
        {name: "Navigation", tests: [
            {name: "ArrowKeyNavigationWorks", tests: async (driver) => {
                await driver.findElement(xpathHelper({attrEq: {"title": TEST_TAG_1}})).click();

                await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
                await sendKeys(driver, Key.ARROW_DOWN);
                await driver.wait(untilElementsNotLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
                await sendKeys(driver, Key.ARROW_UP);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
                await sendKeys(driver, Key.ARROW_RIGHT);
                await driver.wait(untilElementsNotLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
                await sendKeys(driver, Key.ARROW_LEFT);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "ArrowKeyNavigationJumpsToItemPosition", tests: async (driver) => {
                await driver.findElement(xpathHelper({attrEq: {"title": TEST_TAG_1}})).click();
                
                const selectableContents = await driver.findElement(xpathHelper({attrEq: {class: "local-tags-selector"}, descendent: {attrEq: {"class": "lazy-selector-selectable-contents"}}}));
                await scroll(driver, selectableContents, 10, 100);
                await sendKeys(driver, Key.ARROW_DOWN);
                await sendKeys(driver, Key.ARROW_UP);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "RemovingFromBottomUpdatesTagPosition", tests: async (driver) => {
                const scrollCursor = await driver.findElement(xpathHelper({attrContains: {"class": "local-tags-selector"}, descendent: {attrContains: {"class": "scroll-cursor"}}}));
                await drag(driver, scrollCursor, {x: 0, y: 990});
                const tagElement = await driver.findElement(BySelectableTag());
                const tagTitle = await tagElement.getAttribute("title");
                await doubleClick(driver, tagElement);
                await driver.sleep(DEFAULT_SLEEP_TIME);
                await driver.wait(until.elementLocated(BySelectableTag()), DEFAULT_TIMEOUT_TIME);

                await selectTagFromTagSearchQuery(driver, tagTitle);
            }},
            {name: "ScrollingTagsFunctions", tests: async (driver) => {
                await driver.wait(until.elementLocated(BySelectableTag(TEST_TAG_1)));

                const selectableContents = await driver.findElement(xpathHelper({attrEq: {"class": "local-tags-selector"}, descendent: {attrEq: {"class": "lazy-selector-selectable-contents"}}}));
                await scroll(driver, selectableContents, 10, 10);
                await driver.wait(untilElementsNotLocated(BySelectableTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
                await scroll(driver, selectableContents, -10, 10);
                await driver.wait(until.elementLocated(BySelectableTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "ScrollingShouldNotClearVisibleSelection", tests: async (driver) => {
                await driver.findElement(xpathHelper({attrEq: {"title": TEST_TAG_1}})).click();
                
                const selectableContents = await driver.findElement(xpathHelper({attrEq: {"class": "local-tags-selector"}, descendent: {attrEq: {"class": "lazy-selector-selectable-contents"}}}));
                await scroll(driver, selectableContents, 10, 1);
                await scroll(driver, selectableContents, -10, 1);
                await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "selected"}, attrEq: {"title": TEST_TAG_1}})), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "ShiftClickTagsWorksCorrectly", tests: async (driver) => {
                await applyTagFilter(driver, "CLEAR SELECTION");
                await applyTagFilter(driver, "");

                await driver.findElement(BySelectableTag(TEST_TAG_1)).click();
                await modClick(driver, await driver.findElement(BySelectableTag(TEST_TAG_3)), {shift: true});
                await driver.wait(untilCountElementsLocated(BySelectedTag(), 5), DEFAULT_TIMEOUT_TIME);
                await modClick(driver, await driver.findElement(BySelectableTag(TEST_TAG_2)), {shift: true});
                await driver.wait(untilCountElementsLocated(BySelectedTag(), 2), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "CtrlClickTagsWorksCorrectly", tests: async (driver) => {
                await applyTagFilter(driver, "CLEAR SELECTION");
                await applyTagFilter(driver, "");
                
                await driver.findElement(BySelectableTag(TEST_TAG_1)).click();
                await modClick(driver, await driver.findElement(BySelectableTag(TEST_TAG_3)), {ctrl: true});
                await driver.wait(untilCountElementsLocated(BySelectedTag(), 2), DEFAULT_TIMEOUT_TIME);
                await modClick(driver, await driver.findElement(BySelectableTag(TEST_TAG_2)), {ctrl: true});
                await driver.wait(untilCountElementsLocated(BySelectedTag(), 3), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "CtrlShiftClickTagsShiftHasPrecedence", tests: async (driver) => {
                await applyTagFilter(driver, "CLEAR SELECTION");
                await applyTagFilter(driver, "");

                await driver.findElement(BySelectableTag(TEST_TAG_1)).click();
                await modClick(driver, await driver.findElement(BySelectableTag(TEST_TAG_3)), {ctrl: true, shift: true});
                await driver.wait(untilCountElementsLocated(BySelectedTag(), 5), DEFAULT_TIMEOUT_TIME);
            }},
        ]},
        {name: "TagSelectionUpdatesSearchQuery", tests: async (driver) => {
            await applyTagFilter(driver, "CLEAR SELECTION");
            await applyTagFilter(driver, "");

            // Search query
            await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_2);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_3);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_2)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_3)), DEFAULT_TIMEOUT_TIME);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_2);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_3);
            await driver.wait(untilElementsNotLocated(BySearchTag(TEST_TAG_1)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(untilElementsNotLocated(BySearchTag(TEST_TAG_2)), DEFAULT_TIMEOUT_TIME);
            await driver.wait(untilElementsNotLocated(BySearchTag(TEST_TAG_3)), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "CtrlDoubleClickTagsAddsCtrlClickedTags", tests: async (driver) => {
            await applyTagFilter(driver, "CLEAR SELECTION");
            await applyTagFilter(driver, "");

            await driver.findElement(BySelectableTag(TEST_TAG_1)).click();
            await modDoubleClick(driver, await driver.findElement(BySelectableTag(TEST_TAG_3)), {ctrl: true});
            await driver.wait(untilCountElementsLocated(BySearchTag(), 2), DEFAULT_TIMEOUT_TIME);

            await selectTagFromTagSearchQuery(driver, TEST_TAG_1);
            await selectTagFromTagSearchQuery(driver, TEST_TAG_3);
        }},
        {name: "ExclusionCheckboxShowsOnRefresh", tests: async (driver) => {
            await toggleExcludeCheckbox(driver);
            await driver.navigate().refresh();
            await driver.wait(untilCountElementsLocatedNotEquals(ByPage, 0));
            await selectPage(driver, 0);
            await driver.sleep(DEFAULT_SLEEP_TIME);
            // checkbox should still show as checked
            const checkbox = await driver.wait(until.elementLocated(xpathHelper({attrContains: {"class": "exclude-checkbox"}})), DEFAULT_TIMEOUT_TIME);
            const checked = await checkbox.getAttribute("checked");
            if (!checked) {
                throw "Checkbox was not still checked upon reload of page";
            }
            // and should still negate items
            await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
            await driver.wait(until.elementLocated(BySearchTag(`-${TEST_TAG_1}`)), DEFAULT_TIMEOUT_TIME);
            await selectTagFromTagSearchQuery(driver, `-${TEST_TAG_1}`);
            await driver.wait(untilElementsNotLocated(BySearchTag(`-${TEST_TAG_1}`)), DEFAULT_TIMEOUT_TIME);

            await toggleExcludeCheckbox(driver);
        }},
        {name: "ExclusionCheckboxExcludesTag", tests: async (driver) => {
            // selecting negates
            await toggleExcludeCheckbox(driver);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
            await driver.wait(until.elementLocated(BySearchTag(`-${TEST_TAG_1}`)), DEFAULT_TIMEOUT_TIME);
            await selectTagFromTagSearchQuery(driver, `-${TEST_TAG_1}`);
            await driver.wait(untilElementsNotLocated(BySearchTag(`-${TEST_TAG_1}`)), DEFAULT_TIMEOUT_TIME);
            
            // deselecting makes not negated
            await toggleExcludeCheckbox(driver);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_4);
            await driver.wait(until.elementLocated(BySearchTag(TEST_TAG_4)), DEFAULT_TIMEOUT_TIME);
            await selectTagFromLocalTagSelector(driver, TEST_TAG_4);
        }},
        {name: "TagFilterFilters", tests: async (driver) => {
            await applyTagFilter(driver, TEST_TAG_4);
            await driver.wait(untilElementsNotLocated(BySelectableTag(TEST_TAG_5)), DEFAULT_TIMEOUT_TIME);
            await applyTagFilter(driver, "");
            await driver.wait(until.elementsLocated(BySelectableTag(TEST_TAG_5)), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "OrGroupsWork", tests: [
            {name: "DoesOrGroupModalWork", tests: async (driver) => {
                await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
                await selectOrTag(driver);
                await closeModal(driver);
                await selectTagFromTagSearchQuery(driver, TEST_TAG_1);
            }},
            {name: "DoesNormalOrGroupWork", tests: async (driver) => {
                await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
                await selectOrTag(driver);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_2, {parentHasClass: "tag-selector-modal"});
                await selectTagFromLocalTagSelector(driver, TEST_TAG_3, {parentHasClass: "tag-selector-modal"});
                await saveOrTag(driver);
                await selectTagFromTagSearchQuery(driver, `(${TEST_TAG_1} OR ${TEST_TAG_2} OR ${TEST_TAG_3})`);
            }}
        ]},
        {name: "AggregateTag", tests: [
            {name: "DoesAggregateTagModalWork", tests: async (driver) => {
                await selectTagFromLocalTagSelector(driver, "system:aggregate tags");
                await closeModal(driver);
            }},
            {name: "DoesAggregateTagFunctionalityWork", tests: async (driver) => {
                await addAggregateTag(driver, {
                    type: AGGREGATE_TAG_TYPES.NAMESPACE,
                    item: "series"
                }, [
                    {
                        type: AGGREGATE_CONDITION_TYPES.NOT_IN_LIST,
                        query1: [SERIES_TAG_1]
                    },
                    {
                        type: AGGREGATE_CONDITION_TYPES.COUNT_MATCHING,
                        value: 1,
                        comparator: COMPARATORS.GT,
                        query1: [TEST_TAG_1]
                    },
                    {
                        type: AGGREGATE_CONDITION_TYPES.PERCENTAGE_MATCHING,
                        value: 1,
                        comparator: COMPARATORS.GT,
                        query1: [TEST_TAG_1]
                    },
                    {
                        type: AGGREGATE_CONDITION_TYPES.PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY,
                        value: 10,
                        comparator: COMPARATORS.GT,
                        query1: [TEST_TAG_1],
                        query2: [TEST_TAG_1]
                    }
                ]);
                const RESULTANT_TAG = "system:aggregate tag with group:aggregate namespace:series WHERE is not in tags:series:toaru majutsu no index AND must have >1 taggables match the query (1girl) AND must have >1% of taggables match the query (1girl) AND must have >10% of taggables that match the query (1girl) also match the query (1girl)";
                await selectTagFromTagSearchQuery(driver, RESULTANT_TAG);
            }}
        ]},
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
                await selectTagFromTagSearchQuery(driver, generateHasMetricTagName(TEST_METRIC_1_NAME));
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
                await selectTagFromTagSearchQuery(driver, generateHasMetricInMetricServiceTagName(TEST_METRIC_SERVICE_1));
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
                await selectTagFromTagSearchQuery(driver, generateHasMetricComparisonLTTagName(TEST_METRIC_2_NAME, 5));
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
                await selectTagFromTagSearchQuery(driver, generateHasMetricComparisonLTETagName(TEST_METRIC_2_NAME, 5));
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
                await selectTagFromTagSearchQuery(driver, generateHasMetricComparisonGTTagName(TEST_METRIC_2_NAME, 4));
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
                await selectTagFromTagSearchQuery(driver, generateHasMetricComparisonGTETagName(TEST_METRIC_2_NAME, 4));
            }}
        ]}
    ]},
    {name: "ThumbnailGallery", tests: [
        {name: "DoesModifyTaggablesOpen", tests: async (driver) => {
            const image0 = await findThumbnailGalleryImage(driver, 0);
            await image0.click();
            await clickModifyTaggablesButton(driver);
            await closeModal(driver);
        }},
        {name: "DoesModifyTaggablesWork", tests: [
            {name: "Setup", isSetup: true, tests: async (driver) => {
                await selectTagFromLocalTagSelector(driver, TEST_TAG_1);
                await toggleExcludeCheckbox(driver);
                await selectTagFromLocalTagSelector(driver, TEST_TAG_2);
            }},
            {name: "Teardown", isTeardown: true, tests: async (driver) => {
                await selectTagFromTagSearchQuery(driver, TEST_TAG_1);
                await toggleExcludeCheckbox(driver);
                await selectTagFromTagSearchQuery(driver, `-${TEST_TAG_2}`);
            }},
            {name: "DoesRemovingTagWork", tests: async (driver) => {
                const image0 = await findThumbnailGalleryImage(driver, 0);
                await image0.click();
                const image0Title = await image0.getAttribute("title");
                await modifyTaggables(driver, {removeTagsNoConfirm: [TEST_TAG_1]});

                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image0Title}})), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "DoesAddingTagWork", tests: async (driver) => {
                const image0 = await findThumbnailGalleryImage(driver, 0);
                await image0.click();
                const image0Title = await image0.getAttribute("title");
                await modifyTaggables(driver, {addTagsNoConfirm: [TEST_TAG_2]});

                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image0Title}})), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "DoesModifyingMultipleTaggablesWork", tests: async (driver) => {
                const image0 = await findThumbnailGalleryImage(driver, 0);
                await image0.click();
                const image0Title = await image0.getAttribute("title");
                const image1 = await findThumbnailGalleryImage(driver, 1);
                await modClick(driver, image1, {ctrl: true})
                const image1Title = await image1.getAttribute("title");
                await modifyTaggables(driver, {addTagsNoConfirm: [TEST_TAG_2]});

                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image0Title}})), DEFAULT_TIMEOUT_TIME);
                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image1Title}})), DEFAULT_TIMEOUT_TIME);
            }},
        ]},
        {name: "DoesTrashingTaggablesWork", tests: [
            {name: "DoesRemovingSingularTaggableWork", tests: async (driver) => {
                const image0 = await findThumbnailGalleryImage(driver, 0);
                await image0.click();
                const image0Title = await image0.getAttribute("title");
                await trashTaggables(driver);

                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image0Title}})), DEFAULT_TIMEOUT_TIME);
            }},
            {name: "DoesTrashingMultipleTaggablesWork", tests: async (driver) => {
                const image0 = await findThumbnailGalleryImage(driver, 0);
                await image0.click();
                const image0Title = await image0.getAttribute("title");
                const image1 = await findThumbnailGalleryImage(driver, 1);
                await modClick(driver, image1, {ctrl: true})
                const image1Title = await image1.getAttribute("title");
                await trashTaggables(driver);

                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image0Title}})), DEFAULT_TIMEOUT_TIME);
                await driver.wait(untilElementsNotLocated(xpathHelper({attrEq: {"title": image1Title}})), DEFAULT_TIMEOUT_TIME);
            }}
        ]},
        {name: "ResizingChangesThumbnailGalleryImageCount", tests: async (driver) => {
            const imageCount = (await findThumbnailGalleryImages(driver)).length;
            await driver.manage().window().setRect({width: 1080, height: 720});
            await driver.wait(untilCountElementsLocatedNotEquals(BY_THUMBNAIL_GALLERY_IMAGE, imageCount));
            await driver.manage().window().maximize();
        }},
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
            await driver.wait(untilCountElementsLocated(xpathHelper({attrContains: {"class": ["metric-star", "hovered"]}}), 5), DEFAULT_TIMEOUT_TIME);
            await assignMetricStar(driver, TEST_METRIC_2_NAME, 4);
            await driver.wait(untilCountElementsLocated(xpathHelper({attrContains: {"class": ["metric-star", "selected", "hovered"]}}), 4), DEFAULT_TIMEOUT_TIME);
            await hoverMetricStar(driver, TEST_METRIC_1_NAME, 7);
            await driver.wait(untilCountElementsLocated(xpathHelper({attrContains: {"class": ["metric-star", "hovered"]}}), 7), DEFAULT_TIMEOUT_TIME);
            await driver.wait(untilCountElementsLocated(xpathHelper({attrContains: {"class": ["metric-star", "selected"]}}), 4), DEFAULT_TIMEOUT_TIME);
            await closeModal(driver);
        }},
        {name: "BackButtonShouldNavigateBackwards", tests: {
            priority: BUG_PRIORITIES.BACKLOGGED_FOR_LATER,
            notice: BUG_NOTICES.MEDIUM,
            impact: BUG_IMPACTS.COSMETIC,
            expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_DAY
        }}
    ]},
]

/** @type {TestSuite[]} */
export const PAGES_TESTS = [
    {name: "FileSearchPage", tests: FILE_SEARCH_PAGE_TESTS},
    {name: "DuplicatesPage", tests: {
        priority: BUG_PRIORITIES.INTEND_FOR_THIS_RELEASE,
        notice: BUG_NOTICES.FATAL,
        impact: BUG_IMPACTS.UNUSABLE,
        expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_A_MONTH
    }}
]
