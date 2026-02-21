import { realClear, UNTIL_MODAL_CLOSE, xpathHelper } from "../helpers.js";
import { navigateToCreateDownloaderService, navigateToModifyDownloaderServices } from "../navigation/parsers-navigation.js";
import {By} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewDownloaderService(driver, name) {
    await navigateToCreateDownloaderService(driver);

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(name);

    await driver.findElement(xpathHelper({attrEq: {"value": "Create downloader service"}})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 * @param {{
 *   name: string
 * }} modifications
 */
export async function modifyDownloaderService(driver, name, modifications) {
    await navigateToModifyDownloaderServices(driver);
    await driver.findElement(By.name("localDownloaderServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": name}})).click();

    const serviceName = await driver.findElement(By.name("serviceName"));
    await realClear(serviceName);
    await serviceName.sendKeys(modifications.name);

    await driver.findElement(xpathHelper({attrEq: {"value": "Modify selected downloader service"}})).click();
    await driver.wait(UNTIL_MODAL_CLOSE);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function deleteDownloaderService(driver, name) {
    await navigateToModifyDownloaderServices(driver);
    
    await driver.findElement(By.name("localDownloaderServiceID")).click();
    await driver.findElement(xpathHelper({type: "option", attrContains: {"text": name}})).click();
    await driver.findElement(xpathHelper({attrEq: {"value": "Delete selected downloader service"}})).click();
    await driver.switchTo().alert().accept();
    
    await driver.wait(UNTIL_MODAL_CLOSE);
}