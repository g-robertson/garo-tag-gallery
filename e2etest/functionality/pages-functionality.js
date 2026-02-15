import { DEFAULT_SLEEP_TIME, DEFAULT_TIMEOUT_TIME, doubleClick, findMetricVisualizer, modClick, mouseOver, pressDialogBoxOption, realClear, realFocus, untilLocalTagsSelectorRefresh, xpathHelper } from "../helpers.js";
import { navigateToDuplicatesProcessingPage, navigateToFileSearchPage } from "../navigation/pages-navigation.js";
import {By, Condition, Key, until} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewFileSearchPage(driver) {
    await navigateToFileSearchPage(driver);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewDuplicatesProcessingPage(driver) {
    await navigateToDuplicatesProcessingPage(driver);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} tag
 * @param {{
 *   parentHasClass?: string
 *   waitForRefresh?: boolean
 *   shiftClick?: boolean
 * }=} options
 */
export async function selectTagFromLocalTagSelector(driver, tag, options) {
    options ??= {};
    options.waitForRefresh ??= true;
    options.instance ??= 1;
    if (options.instance === 2) {
        options.instance = 1;
    }
    const tagElement = await driver.findElement(xpathHelper({attrContains: {"class": options.parentHasClass}, descendent: {
        attrContains: {"class": "local-tags-selector"}, descendent: {
            attrEq: {"title": tag}, attrContains: {"class": "lazy-selector-selectable-item"}
        }
    }}));
    await doubleClick(driver, tagElement);
    
    if (options.waitForRefresh) {
        await driver.sleep(DEFAULT_SLEEP_TIME);
    }
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} tag
 * @param {{
 *   waitForRefresh?: boolean
 * }=} options
 */
export async function selectTagFromTagSearchQuery(driver, tag, options) {
    options ??= {};
    options.waitForRefresh ??= true;

    // select tag
    const tagSelector = await driver.findElement(xpathHelper({attrContains: {"class": "tag-search-query"}, descendent: {
        attrEq: {"title": tag}, attrContains: {"class": "lazy-selector-selectable-item"}
    }}));
    await doubleClick(driver, tagSelector);
    
    if (options.waitForRefresh) {
        // then wait for current local tags selector to refresh, this ensures next call will not reference a stale element
        await driver.sleep(DEFAULT_SLEEP_TIME);
    }
}

/**
 * @param {ThenableWebDriver} driver
 */
export async function selectOrTag(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "OR"}})).click();
}

/**
 * @param {ThenableWebDriver} driver
 */
export async function saveOrTag(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Select OR Group"}})).click();
}

export const CONDITIONAL_EXPRESSION_LIST_UNION_TYPES = /** @type {const} */ ({
    NAMESPACE: "namespace",
    METRIC: "metric"
});

/** @typedef {(typeof CONDITIONAL_EXPRESSION_LIST_UNION_TYPES)[keyof typeof CONDITIONAL_EXPRESSION_LIST_UNION_TYPES]} ConditionalExpressionListUnionType */

/**
 * @typedef {Object} ConditionalExpressionListUnionType
 * @property {ConditionalExpressionListUnionType} type
 * @property {string} item
 **/

export const EXPRESSION_LIST_UNION_CONDITION_TYPES = /** @type {const} */ ({
    NOT_IN_LIST: "not-in-list-condition",
    COUNT_MATCHING: "count-matching-query-condition",
    PERCENTAGE_MATCHING: "percentage-matching-query-condition",
    PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY: "percentage-of-subquery-matching-query-condition"
});

/** @typedef {(typeof EXPRESSION_LIST_UNION_CONDITION_TYPES)[keyof typeof EXPRESSION_LIST_UNION_CONDITION_TYPES]} ExpressionListUnionConditionType */

export const COMPARATORS = /** @type {const} */ ({
    LT: "<",
    LTE: "<=",
    GT: ">",
    GTE: ">="
});

/** @typedef {(typeof COMPARATORS)[keyof typeof COMPARATORS]} Comparator */

/** 
 * @typedef {Object} ExpressionListUnionCondition
 * @property {ExpressionListUnionConditionType} type
 * @property {Comparator=} comparator
 * @property {number} value
 * @property {string[]} query1
 * @property {string[]} query2
 **/

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {ConditionalExpressionListUnionType} conditionalExpressionListUnionType
 * @param {ExpressionListUnionCondition[]} conditions 
 */
export async function addConditionalExpressionListUnionType(driver, conditionalExpressionListUnionType, conditions) {
    await selectTagFromLocalTagSelector(driver, "system:advanced tag search");
    const conditionalExpressionListUnionTypeElement = await driver.findElement(xpathHelper({attrEq: {"title": `${conditionalExpressionListUnionType.type}:${conditionalExpressionListUnionType.item}`}}));
    await doubleClick(driver, conditionalExpressionListUnionTypeElement);
    for (const condition of conditions) {
        if (condition.type === EXPRESSION_LIST_UNION_CONDITION_TYPES.NOT_IN_LIST) {
            const specifyTagsButton = await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Specify tags"}}));
            await specifyTagsButton.click();
            for (const tag of condition.query1) {
                const tagElement = await driver.findElement(xpathHelper({attrContains: {"class": "select-from-list-of-tags-modal"}, descendent: {attrEq: {"title": tag}}}));
                await doubleClick(driver, tagElement);
            }
            const selectQueryButton = await driver.findElement(xpathHelper({attrContains: {"class": "select-from-list-of-tags-modal"}, descendent: {type: "input", attrEq: {"type": "button"}}}));
            await selectQueryButton.click();
        } else if (
            condition.type === EXPRESSION_LIST_UNION_CONDITION_TYPES.COUNT_MATCHING
         || condition.type === EXPRESSION_LIST_UNION_CONDITION_TYPES.PERCENTAGE_MATCHING
         || condition.type === EXPRESSION_LIST_UNION_CONDITION_TYPES.PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY) {
            await driver.findElement(xpathHelper({attrEq: {"class": condition.type}, descendent: {attrContains: {"text": condition.comparator}, descendent: {type: "input"}}})).click();

            const valueElement = await driver.findElement(xpathHelper({attrEq: {"class": condition.type}, descendent: {type: "input", attrEq: {"type": "text"}}}));
            await realClear(valueElement);
            await valueElement.sendKeys(condition.value);
            await realFocus(valueElement);

            // Specify query(ies)
            await driver.findElement(xpathHelper({attrEq: {"class": condition.type}, descendent: {type: "input", attrEq: {"type": "button"}}})).click();
            for (const tag of condition.query1) {
                await selectTagFromLocalTagSelector(driver, tag, {parentHasClass: "tag-selector-modal"});
            }
            await driver.findElement(xpathHelper({attrEq: {"class": "tag-selector-modal"}, descendent: {type: "input", attrEq: {"type": "button"}, attrContains: {"value": "Select"}}})).click();

            if (condition.type === EXPRESSION_LIST_UNION_CONDITION_TYPES.PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY) {
                for (const tag of condition.query2) {
                    await selectTagFromLocalTagSelector(driver, tag, {parentHasClass: "tag-selector-modal"});
                }
                await driver.findElement(xpathHelper({attrEq: {"class": "tag-selector-modal"}, descendent: {type: "input", attrEq: {"type": "button"}, attrContains: {"value": "Select"}}})).click();
            }
        }
    }

    await driver.findElement(xpathHelper({attrEq: {"value": "Create Conditional List Expression Union"}})).click();
}

export const METRIC_TAG_SEARCH_TYPES = /** @type {const} */ ({
    HAS_METRIC: "Has Metric",
    HAS_METRIC_IN_METRIC_SERVICE: "Has Metric In Metric Service",
    METRIC_LT: "Metric is <",
    METRIC_LTE: "Metric is <=",
    METRIC_GT: "Metric is >",
    METRIC_GTE: "Metric is >=",
});

/** @typedef {(typeof METRIC_TAG_SEARCH_TYPES)[keyof typeof METRIC_TAG_SEARCH_TYPES]} MetricTagSearchType */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} localMetricServiceName
 * @param {string} metricName
 * @param {MetricTagSearchType} searchType
 * @param {number=} comparison
 */
export async function fileSearchMetricTag(driver, localMetricServiceName, metricName, searchType, comparison) {
    comparison ??= 0;
    await selectTagFromLocalTagSelector(driver, "system:metric", {waitForRefresh: false});
    
    await driver.findElement(By.name("localMetricServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": localMetricServiceName}})).click();

    await driver.findElement(By.name("localMetricID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": metricName}})).click();

    const localMetricComparison = await driver.findElement(xpathHelper({attrContains: {"class": "metric-tag-comparison"}}));
    await realClear(localMetricComparison);
    await localMetricComparison.sendKeys(comparison);
    await realFocus(localMetricComparison);

    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": searchType}})).click();

    await driver.sleep(DEFAULT_SLEEP_TIME);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function clickModifyTaggablesButton(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Modify selected taggables"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function saveModifyTaggablesChanges(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Save changes"}})).click();
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {{
 *     addTagsNoConfirm?: string[],
 *     removeTagsNoConfirm?: string[]
 * }} options 
 */
export async function modifyTaggables(driver, options) {
    options.addTagsNoConfirm ??= [];
    options.removeTagsNoConfirm ??= [];

    await clickModifyTaggablesButton(driver);
    for (const tagToAdd of options.addTagsNoConfirm) {
        await applyTagFilter(driver, tagToAdd, {parentHasClass: "modify-taggables-modal"});
        await enterTagFilter(driver, {parentHasClass: "modify-taggables-modal"})
    }
    for (const tagToRemove of options.removeTagsNoConfirm) {
        await selectTagFromLocalTagSelector(driver, tagToRemove, {parentHasClass: "modify-taggables-modal"});
    }
    await saveModifyTaggablesChanges(driver);
}


/**
 * @param {ThenableWebDriver} driver 
 */
export async function trashTaggables(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Trash selected taggables"}})).click();
    await driver.switchTo().alert().accept();
}

/**
 * @param {string} metricName 
 */
export function generateHasMetricTagName(metricName) {
    return `system:has metric from:${metricName}`;
}

/**
 * @param {string} metricService
 */
export function generateHasMetricInMetricServiceTagName(metricService) {
    return `system:has metric in metric service:${metricService}`;
}

/**
 * @param {string} metricName 
 * @param {number} comparisonValue 
 */
export function generateHasMetricComparisonLTTagName(metricName, comparisonValue) {
    return `system:metric comparison:${metricName} < ${comparisonValue}`;
}

/**
 * @param {string} metricName 
 * @param {number} comparisonValue 
 */
export function generateHasMetricComparisonLTETagName(metricName, comparisonValue) {
    return `system:metric comparison:${metricName} <= ${comparisonValue}`;
}

/**
 * @param {string} metricName 
 * @param {number} comparisonValue 
 */
export function generateHasMetricComparisonGTTagName(metricName, comparisonValue) {
    return `system:metric comparison:${metricName} > ${comparisonValue}`;
}

/**
 * @param {string} metricName 
 * @param {number} comparisonValue 
 */
export function generateHasMetricComparisonGTETagName(metricName, comparisonValue) {
    return `system:metric comparison:${metricName} >= ${comparisonValue}`;
}

/**
 * @param {ThenableWebDriver} driver
 */
export async function toggleExcludeCheckbox(driver) {
    await driver.findElement(xpathHelper({attrContains: {"class": "exclude-checkbox"}})).click();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} text
 * @param {{
 *   parentHasClass?: string
 * }=} options
 */
export async function applyTagFilter(driver, text, options) {
    options ??= {};
    const tagFilterInput = await driver.findElement(xpathHelper({attrContains: {"class": options.parentHasClass}, descendent: {attrContains: {"class": "tag-filter-input"}}}));
    await realClear(tagFilterInput);
    await tagFilterInput.sendKeys(text);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {{
 *   parentHasClass?: string
 * }=} options
 */
export async function enterTagFilter(driver, options) {
    options ??= {};
    await driver.findElement(xpathHelper({attrContains: {"class": options.parentHasClass}, descendent: {attrContains: {"class": "tag-filter-input"}}})).sendKeys(Key.ENTER);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} metricName
 * @param {number} starCount
 */
export async function hoverMetricStar(driver, metricName, starCount) {
    const metricStar = await findMetricVisualizer(driver, metricName, starCount);
    await mouseOver(driver, metricStar);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} metricName
 * @param {number} starCount
 */
export async function assignMetricStar(driver, metricName, starCount) {
    const metricStar = await findMetricVisualizer(driver, metricName, starCount);
    await metricStar.click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function beginDatabaseProcessingFiles(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Begin database processing files"}})).click();
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {number} distance 
 */
export async function adjustDuplicateSearchDistance(driver, distance) {
    const duplicateSearchDistanceElement = await driver.findElement(xpathHelper({type: "input", attrContains: {"class": "duplicate-search-distance"}}));
    await realClear(duplicateSearchDistanceElement);
    await duplicateSearchDistanceElement.sendKeys(distance);
}


/**
 * @param {ThenableWebDriver} driver 
 */
export async function beginFilteringPotentialDuplicates(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Begin filtering potential duplicates"}})).click();
    await driver.wait(until.elementLocated(xpathHelper({type: "input", attrEq: {value: "Skip"}, or: {type: "input", attrEq: {value: "Discard"}}})), DEFAULT_TIMEOUT_TIME);
}

export async function duplicateDiscardUncommitted(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Discard"}})).click();
    await driver.wait(until.elementLocated(xpathHelper({type: "input", attrEq: {value: "Skip"}})), DEFAULT_TIMEOUT_TIME);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateCurrentIsBetterTrashOther(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Current is better, trash other"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateCurrentIsBetter(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Current is better"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateSameQualityTrashLarger(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Same quality, trash larger"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateSameQuality(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Same quality"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateAlternates(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Alternates"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateFalsePositive(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "False positives"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateSkip(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Skip"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateGoBack(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Go back"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function commitDuplicates(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Commit"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function commitDuplicatesFromDialog(driver) {
    await pressDialogBoxOption(driver, "Commit");
}