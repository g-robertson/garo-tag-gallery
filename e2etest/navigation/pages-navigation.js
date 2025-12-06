import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToFileSearchPage(driver) {
    await driver.findElement(xpathHelper({containsText: "Page", containsClass: "topbar-dropdown-title"})).click();
    
    await driver.findElement(xpathHelper({containsText: "New file search page", containsClass: "topbar-dropdown-option"})).click();
}