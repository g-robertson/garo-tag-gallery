import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateTagService(driver) {
    const tagsNav = await driver.findElement(xpathHelper({containsText: "Tags", containsClass: "topbar-dropdown-title"}));

    await tagsNav.click();
    const newTagServiceNav = await driver.findElement(xpathHelper({containsText: "Create new tag service", containsClass: "topbar-dropdown-option"}));
    await newTagServiceNav.click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyTagServices(driver) {
    const tagsNav = await driver.findElement(xpathHelper({containsText: "Tags", containsClass: "topbar-dropdown-title"}));

    await tagsNav.click();
    const modifyTagServiceNav = await driver.findElement(xpathHelper({containsText: "Update/delete existing tag service", containsClass: "topbar-dropdown-option"}));
    await modifyTagServiceNav.click();
}