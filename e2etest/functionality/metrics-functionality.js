import { realClear, UNTIL_MODAL_CLOSE, xpathHelper } from "../helpers.js";
import { navigateToCreateMetricService, navigateToCreateNewMetric, navigateToModifyMetricServices } from "../navigation/metrics-navigation.js";
import {By, Key} from "selenium-webdriver"

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
    const submitButton = await driver.findElement(xpathHelper({hasValue: "Submit"}));
    await submitButton.click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteMetricService(driver, name) {
    await navigateToModifyMetricServices(driver);
    const metricService = await driver.findElement(By.name("localMetricServiceID"));
    await metricService.click();
    const localMetricService = await driver.findElement(xpathHelper({type: "option", containsText: name}));
    await localMetricService.click();
    const deleteButton = await driver.findElement(xpathHelper({hasValue: "Delete selected metric service"}));
    await deleteButton.click();
    const deleteMetricServiceConfirm = await driver.switchTo().alert();
    await deleteMetricServiceConfirm.accept();
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
    
    const metricServiceSelect = await driver.findElement(By.name("localMetricServiceID"));
    await metricServiceSelect.click();
    const localMetricService = await driver.findElement(xpathHelper({type: "option", containsText: metric.metricServiceName}));
    await localMetricService.click();

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

    const metricTypeSelect = await driver.findElement(By.name("metricType"));
    await metricTypeSelect.click();
    const metricTypeOption = await driver.findElement(xpathHelper({type: "option", containsText: metric.type}));
    await metricTypeOption.click();

    const submitButton = await driver.findElement(xpathHelper({hasValue: "Submit"}));
    await submitButton.click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}
