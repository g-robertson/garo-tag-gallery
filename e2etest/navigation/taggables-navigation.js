import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateTaggableService(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Taggables", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Create new taggable service", "class": "topbar-dropdown-option"}})).click();
}


/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyTaggableServices(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Taggables", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Update/delete existing taggable service", "class": "topbar-dropdown-option"}})).click();
}