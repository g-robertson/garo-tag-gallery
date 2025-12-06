import { UNTIL_MODAL_CLOSE, xpathHelper } from "../helpers.js";
import { navigateToModifyTaggableServices } from "../navigation/taggables-navigation.js";
import {By} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteTaggableService(driver, name) {
    await navigateToModifyTaggableServices(driver);
    
    await driver.findElement(By.name("localTaggableServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", containsText: name})).click();
    await driver.findElement(xpathHelper({hasValue: "Delete selected taggable service"})).click();
    await driver.switchTo().alert().accept();

    await driver.wait(UNTIL_MODAL_CLOSE);
}