import { readDownloadedFile, rmDownloadedFile, xpathHelper } from "../helpers.js";
import { navigateToBackup, navigateToImportMappingsFromBackup } from "../navigation/file-navigation.js";
import {By} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @description Returns the file created by createBackup
 * @param {ThenableWebDriver} driver
 */
export async function createBackupAsFile(driver) {
    await navigateToBackup(driver);
    return "garo-backup.json";
}

/**
 * @description Returns the text of the created backup
 * @param {ThenableWebDriver} driver
 */
export async function createBackupAsText(driver) {
    await navigateToBackup(driver);
    const backup = await readDownloadedFile("garo-backup.json");
    await rmDownloadedFile("garo-backup.json");
    return backup;
}

/**
 * @description Imports mappings from a backup file
 * @param {ThenableWebDriver} driver
 */
export async function importMappingsFromBackupFile(driver, backupFileName) {
    await navigateToImportMappingsFromBackup(driver);
    const backupFileInput = await driver.findElement(By.name("backup-file"));
    backupFileInput.sendKeys(backupFileName);
    const submitButton = await driver.findElement(xpathHelper({hasValue:"Import from backup"}));
    await submitButton.click();
}