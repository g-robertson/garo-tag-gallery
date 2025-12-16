import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateTagService(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Tags", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Create new tag service", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyTagServices(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Tags", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Update/delete existing tag service", "class": "topbar-dropdown-option"}})).click();
}