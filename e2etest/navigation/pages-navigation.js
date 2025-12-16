import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToFileSearchPage(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Page", "class": "topbar-dropdown-title"}})).click();
    
    await driver.findElement(xpathHelper({attrContains: {"text": "New file search page", "class": "topbar-dropdown-option"}})).click();
}