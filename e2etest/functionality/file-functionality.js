import { closeModal, DEFAULT_TIMEOUT_TIME, readDownloadedFile, rmDownloadedFile, xpathHelper } from "../helpers.js";
import { navigateToBackup, navigateToHydrusImport, navigateToImportMappingsFromBackup } from "../navigation/file-navigation.js";
import {By, until} from "selenium-webdriver"
import path from "path";

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
 * @param {string} backupFileName
 */
export async function importMappingsFromBackupFile(driver, backupFileName) {
    await navigateToImportMappingsFromBackup(driver);
    const backupFileInput = await driver.findElement(By.name("backup-file"));
    backupFileInput.sendKeys(backupFileName);
    
    await driver.findElement(xpathHelper({attrEq: {"value": "Import from backup"}})).click();
}

/**
 * @description Imports files from hydrus
 * @param {ThenableWebDriver} driver
 * @param {{
 *     partialUploadLocation?: string
 *     fileName?: string
 *     fileNames?: string[]
 *     fileNameGroups?: string[][]
 *     taggableServiceName?: string
 *     tagServiceName?: string
 *     finish?: boolean
 * }} importOptions
 */
export async function importFilesFromHydrus(driver, importOptions) {
    importOptions.finish ??= true;

    /** @type {string[][]} */
    let fileNameGroups = [];
    if (importOptions.fileName) {
        fileNameGroups = [[importOptions.fileName]];
    } else if (importOptions.fileNames) {
        fileNameGroups = [importOptions.fileNames];
    } else if (importOptions.fileNameGroups) {
        fileNameGroups = importOptions.fileNameGroups;
    } else {
        throw "One of fileName, fileNames, fileNameGroups must be specified";
    }
    await navigateToHydrusImport(driver);
    if (importOptions.partialUploadLocation) {
        await driver.findElement(xpathHelper({attrEq: {"class": "partial-upload-location-text"}})).sendKeys(importOptions.partialUploadLocation);
        await driver.findElement(xpathHelper({attrEq: {"value": "Create"}})).click();
        await driver.findElement(By.name("remainingPartialPiecesFinishedFake")).click();
    }
    if (importOptions.taggableServiceName) {
        await driver.findElement(By.name("localTaggableServiceID")).click();
        await driver.findElement(xpathHelper({attrEq: {"name": "localTaggableServiceID"}, descendent: {attrContains: {"text": importOptions.taggableServiceName}}})).click();
    }
    if (importOptions.tagServiceName) {
        await driver.findElement(By.name("localTagServiceID")).click();
        await driver.findElement(xpathHelper({attrEq: {"name": "localTagServiceID"}, descendent: {attrContains: {"text": importOptions.tagServiceName}}})).click();
    }
    for (let i = 0; i < fileNameGroups.length; ++i) {
        const fileNames = fileNameGroups[i];
        await driver.findElement(By.name("partialFiles")).clear();
        await driver.findElement(By.name("partialFiles")).sendKeys(
            fileNames.map(fileName => path.resolve(fileName)).join("\n")
        );

        if (i !== fileNameGroups.length - 1) {
            await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Submit"}})).click();
            await driver.wait(until.elementLocated(xpathHelper({attrContains: {"text": "Finished uploading specified files"}})), DEFAULT_TIMEOUT_TIME);
        }
    }

    if (importOptions.finish) {
        await driver.findElement(By.name("remainingPartialPiecesFinishedFake")).click();
    }
    await driver.findElement(xpathHelper({type: "input", attrEq: {"value": "Submit"}})).click();
    await driver.wait(until.elementLocated(xpathHelper({
        attrContains: {"text": "Began job"},
        or: [
            {attrContains: {"text": "No uploaded files were found"}},
            {attrContains: {"text": "Finished uploading specified files"}}
        ]
    })), DEFAULT_TIMEOUT_TIME);

    if (importOptions.finish) {
        await closeModal(driver);
    }
}