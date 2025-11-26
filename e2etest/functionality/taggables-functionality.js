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
    const taggableService = await driver.findElement(By.name("localTaggableServiceID"));
    await taggableService.click();
    const localTaggableService = await driver.findElement(xpathHelper({type: "option", containsText: name}));
    await localTaggableService.click();
    const deleteButton = await driver.findElement(xpathHelper({hasValue: "Delete selected taggable service"}));
    await deleteButton.click();
    const deleteTaggableServiceConfirm = await driver.switchTo().alert();
    await deleteTaggableServiceConfirm.accept();
    await driver.wait(UNTIL_MODAL_CLOSE);
}