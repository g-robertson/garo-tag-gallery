import { DEFAULT_SLEEP_TIME, doubleClick, findMetricVisualizer, mouseOver, realClear, realFocus, xpathHelper } from "../../helpers.js";
import { navigateToDownloaderPage } from "../../navigation/pages-navigation.js";
import {By, Key} from "selenium-webdriver"

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver
 * @param {string} name
 */
export async function createNewDownloaderPage(driver) {
    await navigateToDownloaderPage(driver);
}

/**
 * @param {ThenableWebDriver} driver 
 * @param {string} url
 */
export async function enterDownloaderURL(driver, url) {
    const downloaderURLElem = await driver.findElement(xpathHelper({attrEq: {"class": "downloader-url-input"}}));
    await realClear(downloaderURLElem);
    await downloaderURLElem.sendKeys(url);
    await downloaderURLElem.sendKeys(Key.ENTER);
}
/**
 * @param {ThenableWebDriver} driver 
 */
export async function toggleDownloaderBeginPaused(driver) {
    await driver.findElement(xpathHelper({attrEq: {"value": "Begin query paused"}})).click();
}
/**
 * @param {ThenableWebDriver} driver 
 */
export async function toggleSelectedDownloaderPaused(driver) {
    await driver.findElement(xpathHelper({attrEq: {"value": "Pause/unpause selected query"}})).click();
}
/**
 * @param {ThenableWebDriver} driver 
 */
export async function downloadFromURL(driver) {
    await driver.findElement(xpathHelper({attrEq: {"value": "Download from URL"}})).click();
}
/**
 * @param {ThenableWebDriver} driver 
 */
export async function watchURL(driver) {
    await driver.findElement(xpathHelper({attrEq: {"value": "Watch URL"}})).click();
}
/**
 * @param {ThenableWebDriver} driver 
 */
export async function forceRewatch(driver) {
    await driver.findElement(xpathHelper({attrEq: {"value": "Force download on selected query"}})).click();
}
/**
 * @param {ThenableWebDriver} driver 
 * @param {string} name
 */
export async function enterDownloaderName(driver, name) {
    const downloaderNameElem = await driver.findElement(xpathHelper({attrEq: {"class": "downloader-name-input"}}));
    await realClear(downloaderNameElem);
    await downloaderNameElem.sendKeys(name);
    await downloaderNameElem.sendKeys(Key.ENTER);
}
/**
 * @param {ThenableWebDriver} driver 
 */
export async function setDownloaderFileCountLimit(driver, fileCountLimit) {
    const fileCountElem = await driver.findElement(xpathHelper({attrEq: {"class": "downloader-file-count-limit-input"}}));
    await realClear(fileCountElem);
    await fileCountElem.sendKeys(fileCountLimit);
    await fileCountElem.sendKeys(Key.ENTER);
}
/**
 * @param {string} downloaderName
 */
export async function BySelectableDownloaderQuery(downloaderName) {
    return xpathHelper({attrContains: {"class": "downloader-query"}, descendent: {
        attrContains: {"class": "lazy-selector-selectable-item"},
        attrEq: {"text": downloaderName}
    }});
}