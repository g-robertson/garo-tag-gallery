import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateMetricService(driver) {
    const metricsNav = await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"}));

    await metricsNav.click();
    const newMetricServiceNav = await driver.findElement(xpathHelper({containsText: "Create new metric service", containsClass: "topbar-dropdown-option"}));
    await newMetricServiceNav.click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyMetricServices(driver) {
    const metricsNav = await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"}));

    await metricsNav.click();
    const modifyMetricServiceNav = await driver.findElement(xpathHelper({containsText: "Update/delete existing metric service", containsClass: "topbar-dropdown-option"}));
    await modifyMetricServiceNav.click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateNewMetric(driver) {
    const metricsNav = await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"}));

    await metricsNav.click();
    const newMetricNav = await driver.findElement(xpathHelper({containsText: "Create new metric", notContainsText: "Create new metric service", containsClass: "topbar-dropdown-option"}));
    await newMetricNav.click();
}