import { DEFAULT_TIMEOUT_TIME, pressDialogBoxOption, realClear, xpathHelper } from "../../helpers.js";
import { navigateToDuplicatesProcessingPage } from "../../navigation/pages-navigation.js";
import {Key, until} from "selenium-webdriver"

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewDuplicatesProcessingPage(driver) {
    await navigateToDuplicatesProcessingPage(driver);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function beginDatabaseProcessingFiles(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Begin database processing files"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 * @param {number} distance 
 */
export async function getDuplicateSearchDistance(driver) {
    const duplicateSearchDistanceElement = await driver.findElement(xpathHelper({type: "input", attrContains: {"class": "duplicate-search-distance"}}));
    return await duplicateSearchDistanceElement.getAttribute("value");
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {number} distance 
 */
export async function adjustDuplicateSearchDistance(driver, distance) {
    const duplicateSearchDistanceElement = await driver.findElement(xpathHelper({type: "input", attrContains: {"class": "duplicate-search-distance"}}));
    await realClear(duplicateSearchDistanceElement);
    await duplicateSearchDistanceElement.sendKeys(distance);
    await duplicateSearchDistanceElement.sendKeys(Key.ENTER);
}

export async function duplicateSetAllSmallerExactDuplicatesAsBetter(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Set all smaller exact pixel duplicates as better"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function beginFilteringPotentialDuplicates(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Begin filtering potential duplicates"}})).click();
    await driver.wait(until.elementLocated(xpathHelper({type: "input", attrEq: {value: "Skip"}, or: {type: "input", attrEq: {value: "Discard"}}})), DEFAULT_TIMEOUT_TIME);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateReopenUncommitted(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Reopen"}})).click();
    await driver.wait(until.elementLocated(xpathHelper({type: "input", attrEq: {value: "Skip"}})), DEFAULT_TIMEOUT_TIME);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateDiscardUncommitted(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Discard"}})).click();
    await driver.wait(until.elementLocated(xpathHelper({type: "input", attrEq: {value: "Skip"}})), DEFAULT_TIMEOUT_TIME);
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateCurrentIsBetterTrashOther(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Current is better, trash other"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateCurrentIsBetter(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Current is better"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateSameQualityTrashLarger(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Same quality, trash larger"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateSameQuality(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Same quality"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateAlternates(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Alternates"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateFalsePositive(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "False positives"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateSkip(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Skip"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateGoBack(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Go back"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateCommitChanges(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Commit"}})).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateDiscardChanges(driver) {
    await driver.findElement(xpathHelper({type: "input", attrEq: {value: "Discard ALL changes"}})).click();
    await pressDialogBoxOption(driver, "Yes");
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function duplicateCommitChangesFromDialog(driver) {
    await pressDialogBoxOption(driver, "Commit");
}