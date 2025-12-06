import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateMetricService(driver) {
    await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Create new metric service", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyMetricServices(driver) {
    await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Update/delete existing metric service", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateNewMetric(driver) {
    await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Create new metric", notContainsText: "Create new metric service", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyMetric(driver) {
    await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Update/delete existing metric", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToChangeTagToMetric(driver) {
    await driver.findElement(xpathHelper({containsText: "Metrics", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Change tag to metric", containsClass: "topbar-dropdown-option"})).click();
}