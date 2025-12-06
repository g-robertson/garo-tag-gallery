import { DEFAULT_SLEEP_TIME, DEFAULT_TIMEOUT_TIME, doubleClick, findMetricVisualizer, mouseOver, realClear, realFocus, untilLocalTagsSelectorRefresh, xpathHelper } from "../helpers.js";
import { navigateToFileSearchPage } from "../navigation/pages-navigation.js";
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
 * @param {string} tag
 * @param {{
 *   parentHasClass?: string
 *   waitForRefresh?: boolean
 * }=} options
 */
export async function selectTagFromLocalTagSelector(driver, tag, options) {
    options ??= {};
    options.waitForRefresh ??= true;
    options.instance ??= 1;
    if (options.instance === 2) {
        options.instance = 1;
    }
    const tagElement = await driver.findElement(xpathHelper({containsClass: options.parentHasClass, descendent: {
        containsClass: "local-tags-selector", descendent: {
            hasTitle: tag, containsClass: "lazy-selector-selectable-item"
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
    const tagSelector = await driver.findElement(xpathHelper({containsClass: "tag-search-query", descendent: {
        hasTitle: tag, containsClass: "lazy-selector-selectable-item"
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
    await driver.findElement(xpathHelper({type: "input", hasValue: "OR"})).click();
}

/**
 * @param {ThenableWebDriver} driver
 */
export async function saveOrTag(driver) {
    await driver.findElement(xpathHelper({type: "input", hasValue: "Select OR Group"})).click();
}

export const AGGREGATE_TAG_TYPES = /** @type {const} */ ({
    NAMESPACE: "aggregate namespace",
    METRIC: "aggregate metric"
});

/** @typedef {(typeof AGGREGATE_TAG_TYPES)[keyof typeof AGGREGATE_TAG_TYPES]} AggregateTagType */

/**
 * @typedef {Object} AggregateTag
 * @property {AggregateTagType} type
 * @property {string} item
 **/

export const AGGREGATE_CONDITION_TYPES = /** @type {const} */ ({
    NOT_IN_LIST: "not-in-list-condition",
    COUNT_MATCHING: "count-matching-query-condition",
    PERCENTAGE_MATCHING: "percentage-matching-query-condition",
    PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY: "percentage-of-subquery-matching-query-condition"
});

/** @typedef {(typeof AGGREGATE_CONDITION_TYPES)[keyof typeof AGGREGATE_CONDITION_TYPES]} AggregateConditionType */

export const COMPARATORS = /** @type {const} */ ({
    LT: "<",
    LTE: "<=",
    GT: ">",
    GTE: ">="
});

/** @typedef {(typeof COMPARATORS)[keyof typeof COMPARATORS]} Comparator */

/** 
 * @typedef {Object} AggregateCondition
 * @property {AggregateConditionType} type
 * @property {Comparator=} comparator
 * @property {number} value
 * @property {string[]} query1
 * @property {string[]} query2
 **/

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {AggregateTag} aggregateTag 
 * @param {AggregateCondition[]} conditions 
 */
export async function addAggregateTag(driver, aggregateTag, conditions) {
    await selectTagFromLocalTagSelector(driver, "system:aggregate tags");
    const aggregateTagElement = await driver.findElement(xpathHelper({hasTitle: `${aggregateTag.type}:${aggregateTag.item}`}));
    await doubleClick(driver, aggregateTagElement);
    for (const condition of conditions) {
        if (condition.type === AGGREGATE_CONDITION_TYPES.NOT_IN_LIST) {
            const specifyTagsButton = await driver.findElement(xpathHelper({type: "input", hasValue: "Specify tags"}));
            await specifyTagsButton.click();
            for (const tag of condition.query1) {
                const tagElement = await driver.findElement(xpathHelper({containsClass: "select-from-list-of-tags-modal", descendent: {hasTitle: tag}}));
                await doubleClick(driver, tagElement);
            }
            const selectQueryButton = await driver.findElement(xpathHelper({containsClass: "select-from-list-of-tags-modal", descendent: {type: "input", hasInputType: "button"}}));
            await selectQueryButton.click();
        } else if (
            condition.type === AGGREGATE_CONDITION_TYPES.COUNT_MATCHING
         || condition.type === AGGREGATE_CONDITION_TYPES.PERCENTAGE_MATCHING
         || condition.type === AGGREGATE_CONDITION_TYPES.PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY) {
            await driver.findElement(xpathHelper({hasClass: condition.type, descendent: {containsText: condition.comparator, descendent: {type: "input"}}})).click();

            const valueElement = await driver.findElement(xpathHelper({hasClass: condition.type, descendent: {type: "input", hasInputType: "text"}}));
            await realClear(valueElement);
            await valueElement.sendKeys(condition.value);
            await realFocus(valueElement);

            // Specify query(ies)
            await driver.findElement(xpathHelper({hasClass: condition.type, descendent: {type: "input", hasInputType: "button"}})).click();
            for (const tag of condition.query1) {
                await selectTagFromLocalTagSelector(driver, tag, {parentHasClass: "tag-selector-modal"});
            }
            await driver.findElement(xpathHelper({hasClass: "tag-selector-modal", descendent: {type: "input", hasInputType: "button", valueContains: "Select"}})).click();

            if (condition.type === AGGREGATE_CONDITION_TYPES.PERCENTAGE_OF_SUBQUERY_MATCHING_QUERY) {
                for (const tag of condition.query2) {
                    await selectTagFromLocalTagSelector(driver, tag, {parentHasClass: "tag-selector-modal"});
                }
                await driver.findElement(xpathHelper({hasClass: "tag-selector-modal", descendent: {type: "input", hasInputType: "button", valueContains: "Select"}})).click();
            }
        }
    }

    await driver.findElement(xpathHelper({hasValue: "Create Aggregate Tag"})).click();
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
    await driver.findElement(xpathHelper({type: "option", containsText: localMetricServiceName})).click();

    await driver.findElement(By.name("localMetricID")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: metricName})).click();

    const localMetricComparison = await driver.findElement(xpathHelper({containsClass: "metric-tag-comparison"}));
    await realClear(localMetricComparison);
    await localMetricComparison.sendKeys(comparison);
    await realFocus(localMetricComparison);

    await driver.findElement(xpathHelper({type: "input", hasValue: searchType})).click();

    await driver.sleep(DEFAULT_SLEEP_TIME);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function clickModifyTaggablesButton(driver) {
    await driver.findElement(xpathHelper({type: "input", hasValue: "Modify selected taggables"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function saveModifyTaggablesChanges(driver) {
    await driver.findElement(xpathHelper({type: "input", hasValue: "Save changes"})).click();
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
    await driver.findElement(xpathHelper({type: "input", hasValue: "Trash selected taggables"})).click();
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
    await driver.findElement(xpathHelper({containsClass: "exclude-checkbox"})).click();
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
    const tagFilterInput = await driver.findElement(xpathHelper({containsClass: options.parentHasClass, descendent: {containsClass: "tag-filter-input"}}));
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
    await driver.findElement(xpathHelper({containsClass: options.parentHasClass, descendent: {containsClass: "tag-filter-input"}})).sendKeys(Key.ENTER);
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