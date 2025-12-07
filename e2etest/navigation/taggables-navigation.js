import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateTaggableService(driver) {
    await driver.findElement(xpathHelper({containsText: "Taggables", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Create new taggable service", containsClass: "topbar-dropdown-option"})).click();
}


/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyTaggableServices(driver) {
    await driver.findElement(xpathHelper({containsText: "Taggables", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Update/delete existing taggable service", containsClass: "topbar-dropdown-option"})).click();
}