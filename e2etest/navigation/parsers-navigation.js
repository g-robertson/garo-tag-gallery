import { xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateLocalDownloaderService(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Parsers", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Create new downloader service", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyLocalDownloaderServices(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Parsers", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Update/delete existing downloader service", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToCreateNewURLParser(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Parsers", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Create new URL parser", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToModifyURLParser(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "Parsers", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Update/delete existing URL parser", "class": "topbar-dropdown-option"}})).click();
}