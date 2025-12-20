import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateMetricService(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Metrics", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Create new metric service", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyMetricServices(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Metrics", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Update/delete existing metric service", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateNewMetric(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Metrics", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({
        attrContains: {"text": "Create new metric", "class": "topbar-dropdown-option"},
        attrNotContains: {"text": "Create new metric service"}
    })).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyMetric(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Metrics", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrNotContains: {"text": "Update/delete existing metric service"}, attrContains: {"text": "Update/delete existing metric", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToChangeTagToMetric(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Metrics", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Change tag to metric", "class": "topbar-dropdown-option"}})).click();
}