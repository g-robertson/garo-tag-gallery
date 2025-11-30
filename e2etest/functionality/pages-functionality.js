import { DEFAULT_TIMEOUT_TIME, DEFAULT_SLEEP_TIME, doubleClick, findMetricVisualizer, mouseOver, realClear, realFocus, untilLocalTagsSelectorRefresh, xpathHelper } from "../helpers.js";
import { navigateToFileSearchPage } from "../navigation/pages-navigation.js";
import {By, Key} from "selenium-webdriver"

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
 *   waitForRefresh?: boolean
 * }=} options
 */
export async function fileSearchSelectTag(driver, tag, options) {
    options ??= {};
    options.waitForRefresh ??= true;
    // select tag
    const tagSelector = await driver.findElement(xpathHelper({containsClass: "local-tags-selector", descendent: {
        hasTitle: tag, containsClass: "lazy-selector-selectable-item"
    }}));
    await doubleClick(driver, tagSelector);
    
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
export async function fileSearchSelectQueriedTag(driver, tag, options) {
    options ??= {};
    options.waitForRefresh ??= true;
    // get current local tags selector
    const localTagsSelector = await driver.findElement(xpathHelper({containsClass: "local-tags-selector"}));
    const untilRefresh = await untilLocalTagsSelectorRefresh(localTagsSelector);

    // select tag
    const tagSelector = await driver.findElement(xpathHelper({containsClass: "tag-search-query", descendent: {
        hasTitle: tag, containsClass: "lazy-selector-selectable-item"
    }}));
    await doubleClick(driver, tagSelector);
    
    if (options.waitForRefresh) {
        // then wait for current local tags selector to refresh, this ensures next call will not reference a stale element
        await driver.wait(untilRefresh);
    }
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
    await fileSearchSelectTag(driver, "system:metric", {waitForRefresh: false});
    
    const metricServiceSelect = await driver.findElement(By.name("localMetricServiceID"));
    await metricServiceSelect.click();
    const localMetricService = await driver.findElement(xpathHelper({type: "option", containsText: localMetricServiceName}));
    await localMetricService.click();

    const metricSelect = await driver.findElement(By.name("localMetricID"));
    await metricSelect.click();
    const localMetric = await driver.findElement(xpathHelper({type: "option", containsText: metricName}));
    await localMetric.click();

    const localMetricComparison = await driver.findElement(xpathHelper({containsClass: "metric-tag-comparison"}));
    await realClear(localMetricComparison);
    await localMetricComparison.sendKeys(comparison);
    await realFocus(localMetricComparison);

    const searchButton = await driver.findElement(xpathHelper({type: "input", hasValue: searchType}));
    await searchButton.click();

    await driver.sleep(DEFAULT_SLEEP_TIME);
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
    const excludeCheckbox = await driver.findElement(xpathHelper({containsClass: "exclude-checkbox"}));
    await excludeCheckbox.click();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} text
 */
export async function applyTagFilter(driver, text) {
    const tagFilterInput = await driver.findElement(xpathHelper({containsClass: "tag-filter-input"}));
    await realClear(tagFilterInput);
    await tagFilterInput.sendKeys(text);
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