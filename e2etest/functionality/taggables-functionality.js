import { realClear, UNTIL_MODAL_CLOSE, xpathHelper } from "../helpers.js";
import { navigateToCreateTaggableService, navigateToModifyTaggableServices } from "../navigation/taggables-navigation.js";
import {By} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewTaggableService(driver, name) {
    await navigateToCreateTaggableService(driver);

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(name);

    await driver.findElement(xpathHelper({attrEq: {"value": "Create taggable service"}})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 * @param {{
 *   name: string
 * }} modifications
 */
export async function modifyTaggableService(driver, name, modifications) {
    await navigateToModifyTaggableServices(driver);
    await driver.findElement(By.name("localTaggableServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": name}})).click();

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(modifications.name);

    await driver.findElement(xpathHelper({attrEq: {"value": "Modify selected taggable service"}})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteTaggableService(driver, name) {
    await navigateToModifyTaggableServices(driver);
    
    await driver.findElement(By.name("localTaggableServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": name}})).click();
    await driver.findElement(xpathHelper({attrEq: {"value": "Delete selected taggable service"}})).click();
    await driver.switchTo().alert().accept();

    await driver.wait(UNTIL_MODAL_CLOSE);
}