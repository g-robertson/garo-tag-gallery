import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateTagService(driver) {
    await driver.findElement(xpathHelper({containsText: "Tags", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Create new tag service", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyTagServices(driver) {
    await driver.findElement(xpathHelper({containsText: "Tags", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Update/delete existing tag service", containsClass: "topbar-dropdown-option"})).click();
}