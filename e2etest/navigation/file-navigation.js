import { checkForDownload, xpathHelper } from "../helpers.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToHydrusImport(driver) {
    const fileNav = await driver.findElement(xpathHelper({containsText: "File", containsClass: "topbar-dropdown-title"}));
    await fileNav.click();
    const hydrusImportNav = await driver.findElement(xpathHelper({containsText: "Import files from Hydrus", containsClass: "topbar-dropdown-option"}));
    await hydrusImportNav.click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToImportMappingsFromBackup(driver) {
    const fileNav = await driver.findElement(xpathHelper({containsText: "File", containsClass: "topbar-dropdown-title"}));

    await fileNav.click();
    const importMappingsFromBackupNav = await driver.findElement(xpathHelper({containsText: "Import mappings from backup", containsClass: "topbar-dropdown-option"}));
    await importMappingsFromBackupNav.click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function navigateToBackup(driver) {
    const fileNav = await driver.findElement(xpathHelper({containsText: "File", containsClass: "topbar-dropdown-title"}));

    await fileNav.click();
    const backupNav = await driver.findElement(xpathHelper({containsText: "Download backup", containsClass: "topbar-dropdown-option"}));
    await backupNav.click();
    if (!(await checkForDownload("garo-backup.json", 1000))) {
        throw "Backup file not downloaded from backup download click";
    }
}