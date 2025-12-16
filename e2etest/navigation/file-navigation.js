import { checkForDownload, xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToHydrusImport(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "File", "class": "topbar-dropdown-title"}})).click();
    
    await driver.findElement(xpathHelper({attrContains: {"text": "Import files from Hydrus", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToImportMappingsFromBackup(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "File", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Import mappings from backup", "class": "topbar-dropdown-option"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToBackup(driver) {
    await driver.findElement(xpathHelper({attrContains: {"text": "File", "class": "topbar-dropdown-title"}})).click();

    await driver.findElement(xpathHelper({attrContains: {"text": "Download backup","class": "topbar-dropdown-option"}})).click();
    if (!(await checkForDownload("garo-backup.json", 1000))) {
        throw "Backup file not downloaded from backup download click";
    }
}