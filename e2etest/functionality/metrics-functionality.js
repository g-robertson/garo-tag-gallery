import { closeModal, DEFAULT_TIMEOUT_TIME, realClear, UNTIL_MODAL_CLOSE, xpathHelper } from "../helpers.js";
import { navigateToChangeTagToMetric, navigateToCreateMetricService, navigateToCreateNewMetric, navigateToModifyMetricServices } from "../navigation/metrics-navigation.js";
import {By, Key, until} from "selenium-webdriver"
import { applyTagFilter, selectTagFromLocalTagSelector } from "./pages-functionality.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewMetricService(driver, name) {
    await navigateToCreateMetricService(driver);

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(name);

    await driver.findElement(xpathHelper({hasValue: "Submit"})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteMetricService(driver, name) {
    await navigateToModifyMetricServices(driver);

    await driver.findElement(By.name("localMetricServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: name})).click();
    await driver.findElement(xpathHelper({hasValue: "Delete selected metric service"})).click();
    await driver.switchTo().alert().accept();

    await driver.wait(UNTIL_MODAL_CLOSE);
}

export const METRIC_TYPES = /** @type {const} */ ({
    NUMERIC: "Numeric",
    STARS: "Stars",
    INCDEC: "Inc/Dec"
});
/** @typedef {(typeof METRIC_TYPES)[keyof typeof METRIC_TYPES]} MetricType */

/**
 * @param {ThenableWebDriver} driver
 * @param {{
 *   metricServiceName: string,
 *   metricName: string,
 *   lowerBound?: number,
 *   upperBound?: number,
 *   precision?: number,
 *   type: MetricType
 * }} metric
 */
export async function createNewMetric(driver, metric) {
    metric.precision ??= 0;
    metric.lowerBound ??= 0;
    metric.upperBound ??= 10;
    await navigateToCreateNewMetric(driver);
    
    await driver.findElement(By.name("localMetricServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: metric.metricServiceName})).click();

    const metricName = await driver.findElement(By.name("metricName"));
    await realClear(metricName);
    await metricName.sendKeys(metric.metricName);

    let metricLowerBound = await driver.findElement(By.name("lowerBound"));
    await realClear(metricLowerBound);
    await metricLowerBound.sendKeys(metric.lowerBound);

    const metricUpperBound = await driver.findElement(By.name("upperBound"));
    await realClear(metricUpperBound);
    await metricUpperBound.sendKeys(metric.upperBound.toString());

    const metricPrecision = await driver.findElement(xpathHelper({containsClass: "fake-precision-input"}));
    await realClear(metricPrecision);
    await metricPrecision.sendKeys(metric.precision);

    await driver.findElement(By.name("metricType")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: metric.type})).click();
    await driver.findElement(xpathHelper({hasValue: "Submit"})).click();

    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {string} tag 
 * @param {string} localMetricServiceName 
 * @param {string} localMetricName 
 * @param {number} metricValue 
 * @param {boolean} removeExistingTag 
 */
export async function changeTagToMetric(driver, tag, localMetricServiceName, localMetricName, metricValue, removeExistingTag) {
    await navigateToChangeTagToMetric(driver);
    await applyTagFilter(driver, tag, {parentHasClass: "change-tag-to-metric-modal"});
    await selectTagFromLocalTagSelector(driver, tag, {parentHasClass: "change-tag-to-metric-modal"});

    await driver.findElement(By.name("localMetricServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: localMetricServiceName})).click();
    await driver.findElement(By.name("localMetricID")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: localMetricName})).click();

    const metricValueInput = await driver.findElement(By.name("metricValue"));
    await realClear(metricValueInput);
    await metricValueInput.sendKeys(metricValue);

    if (removeExistingTag) {
        await driver.findElement(By.name("removeExistingTag")).click();
    }

    await driver.findElement(xpathHelper({hasValue: "Submit"})).click();
    await driver.wait(until.elementLocated(xpathHelper({containsText: "Successfully set tag "})), DEFAULT_TIMEOUT_TIME);
    await closeModal(driver);
}