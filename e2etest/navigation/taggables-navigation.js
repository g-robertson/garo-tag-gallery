import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyTaggableServices(driver) {
    const taggablesNav = await driver.findElement(xpathHelper({containsText: "Taggables", containsClass: "topbar-dropdown-title"}));

    await taggablesNav.click();
    const modifyTaggableServiceNav = await driver.findElement(xpathHelper({containsText: "Update/delete existing taggable service", containsClass: "topbar-dropdown-option"}));
    await modifyTaggableServiceNav.click();
}