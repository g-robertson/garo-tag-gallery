import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToFileSearchPage(driver) {
    const pagesNav = await driver.findElement(xpathHelper({containsText: "Page", containsClass: "topbar-dropdown-title"}));
    await pagesNav.click();
    const fileSearchPageNav = await driver.findElement(xpathHelper({containsText: "New file search page", containsClass: "topbar-dropdown-option"}));
    await fileSearchPageNav.click();
}