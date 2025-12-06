import { checkForDownload, xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToHydrusImport(driver) {
    await driver.findElement(xpathHelper({containsText: "File", containsClass: "topbar-dropdown-title"})).click();
    
    await driver.findElement(xpathHelper({containsText: "Import files from Hydrus", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToImportMappingsFromBackup(driver) {
    await driver.findElement(xpathHelper({containsText: "File", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Import mappings from backup", containsClass: "topbar-dropdown-option"})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToBackup(driver) {
    await driver.findElement(xpathHelper({containsText: "File", containsClass: "topbar-dropdown-title"})).click();

    await driver.findElement(xpathHelper({containsText: "Download backup", containsClass: "topbar-dropdown-option"})).click();
    if (!(await checkForDownload("garo-backup.json", 1000))) {
        throw "Backup file not downloaded from backup download click";
    }
}