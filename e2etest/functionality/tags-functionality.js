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
    const submitButton = await driver.findElement(xpathHelper({hasValue: "Submit"}));
    await submitButton.click();
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
    const tagServiceSelect = await driver.findElement(By.name("localTagServiceID"));
    await tagServiceSelect.click();
    const localTagService = await driver.findElement(xpathHelper({type: "option", containsText: name}));
    await localTagService.click();
    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(modifications.name);
    const modifyButton = await driver.findElement(xpathHelper({hasValue: "Modify selected tag service"}));
    await modifyButton.click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteTagService(driver, name) {
    await navigateToModifyTagServices(driver);
    const tagService = await driver.findElement(By.name("localTagServiceID"));
    await tagService.click();
    const localTagService = await driver.findElement(xpathHelper({type: "option", containsText: name}));
    await localTagService.click();
    const deleteButton = await driver.findElement(xpathHelper({hasValue: "Delete selected tag service"}));
    await deleteButton.click();
    const deleteTagServiceConfirm = await driver.switchTo().alert();
    await deleteTagServiceConfirm.accept();
    await driver.wait(UNTIL_MODAL_CLOSE);
}