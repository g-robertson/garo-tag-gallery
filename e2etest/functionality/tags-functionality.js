import { realClear, UNTIL_MODAL_CLOSE, xpathHelper } from "../helpers.js";
import { navigateToCreateTagService, navigateToModifyTagServices } from "../navigation/tags-navigation.js";
import {By} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewTagService(driver, name) {
    await navigateToCreateTagService(driver);

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(name);

    await driver.findElement(xpathHelper({attrEq: {"value": "Submit"}})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 * @param {{
 *   name: string
 * }} modifications
 */
export async function modifyTagService(driver, name, modifications) {
    await navigateToModifyTagServices(driver);
    await driver.findElement(By.name("localTagServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": name}})).click();

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(modifications.name);

    await driver.findElement(xpathHelper({attrEq: {"value": "Modify selected tag service"}})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteTagService(driver, name) {
    await navigateToModifyTagServices(driver);
    
    await driver.findElement(By.name("localTagServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": name}})).click();
    await driver.findElement(xpathHelper({attrEq: {"value": "Delete selected tag service"}})).click();
    await driver.switchTo().alert().accept();
    
    await driver.wait(UNTIL_MODAL_CLOSE);
}