import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
import path from "path";
import {Button, By, Key, Origin, until} from "selenium-webdriver";
import { navigateToModifyTaggableServices } from "./navigation/taggables-navigation.js";
import { deleteTagService } from "./functionality/tags-functionality.js";
import { deleteTaggableService } from "./functionality/taggables-functionality.js";

/** @import {ThenableWebDriver, Locator, WebElement} from "selenium-webdriver" */
/** @import {IDirection} from "selenium-webdriver/lib/input.js" */

export const DEFAULT_TIMEOUT_TIME = Number(process.env.DEFAULT_TIMEOUT_TIME);
export const DEFAULT_SLEEP_TIME = Number(process.env.DEFAULT_SLEEP_TIME);
export const DOWNLOAD_DIRECTORY = path.resolve(path.join(process.env.DATABASE_DIR, "e2e-downloads"));

/**
 * @param {ThenableWebDriver} driver 
 */
export async function findModals(driver) {
    return await driver.findElements(By.className("modal"));
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function closeModal(driver) {
    const modalCancel = await driver.findElement(By.className("modal-cancel"));
    await modalCancel.click();
}

export const UNTIL_MODAL_OPEN = until.elementsLocated(By.className("modal"));
export const UNTIL_MODAL_CLOSE = untilElementsNotLocated(By.className("modal"));

export const UNTIL_GALLERY_OPEN = until.elementsLocated(By.className("gallery-item"));

export const ByPage = By.className("page-navbar-topbar-dropdown-title")

/**
 * @param {ThenableWebDriver} driver 
 */
export async function findPages(driver) {
    return await driver.findElements(ByPage);
}

/**
 * @param {ThenableWebDriver} driver 
 * @param {number} pageNumber
 */
export async function selectPage(driver, pageNumber) {
    const pages = await findPages(driver);
    await pages[pageNumber].click();
}

/**
 * @param {ThenableWebDriver} driver 
 * @param {number=} pageNumber
 */
export async function closePage(driver, pageNumber) {
    pageNumber ??= 0;
    const pages = await findPages(driver);
    const page = pages[pageNumber];
    const pageCancel = await page.findElement(By.className("page-cancel"));
    await pageCancel.click();
}

export const BY_THUMBNAIL_GALLERY_IMAGE = xpathHelper({containsClass: "thumbnail-gallery-item", nthParent: 1});

/**
 * @param {ThenableWebDriver} driver 
 * @param {number=} imageNumber
 */
export async function findThumbnailGalleryImages(driver) {
    return driver.findElements(BY_THUMBNAIL_GALLERY_IMAGE);
}

/**
 * @param {ThenableWebDriver} driver 
 * @param {number=} imageNumber
 */
export async function findThumbnailGalleryImage(driver, imageNumber) {
    imageNumber ??= 0;
    const images = await findThumbnailGalleryImages(driver);
    return images[imageNumber];
}

/**
 * @param {string} tag 
 */
export function BySearchTag(tag) {
    return xpathHelper({containsClass: "tag-search-query", descendent: {
        containsClass: "lazy-selector-selectable-item",
        hasTitle: tag
    }});
}

/**
 * @param {string} tag 
 */
export function BySelectableTag(tag) {
    return xpathHelper({containsClass: "local-tags-selector", descendent: {
        containsClass: "lazy-selector-selectable-item",
        hasTitle: tag ?? true
    }});
}

/**
 * @param {string} tagServiceName
 */
export function BySearchQueryTagService(tagServiceName) {
    return ByMultiSelectOption(tagServiceName, {ancestorWithClass: "tag-service-selector"});
}

/**
 * @param {string} multiSelectOption
 * @param {{
 *     ancestorWithClass?: string 
 * }=} options
 */
export function ByMultiSelectOption(multiSelectOption, options) {
    options ??= {};
    return xpathHelper({containsClass: options.ancestorWithClass, descendent: {
        containsClass: "multiselect-option",
        descendentContainsText: multiSelectOption,
    }});
}

export const UNTIL_JOB_BEGIN = until.elementLocated(By.className("job"));
export const UNTIL_JOB_END = untilElementsNotLocated(By.className("job"));


/**
 * @param {WebElement} localTagsSelector
 */
export async function untilLocalTagsSelectorRefresh(localTagsSelector) {
    const tagSelectableItem = await localTagsSelector.findElement(xpathHelper({containsClass: "lazy-selector-selectable-item"}));
    const reactRef = await tagSelectableItem.getAttribute("data-react-ref");
    return untilElementsNotLocated(xpathHelper({
        dataContains: new Map([["data-react-ref", reactRef]])
    }));
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} metricName
 * @param {number} starCount
 */
export async function findMetricVisualizer(driver, metricName, starCount) {
    const starIndex = starCount - 1;
    const visualizers = await driver.findElements(xpathHelper({containsClass: "metric-visual-container", descendentContainsText: metricName, descendent: {
        containsClass: "metric-star"
    }}));

    const visualizer = visualizers[starIndex];
    if (visualizer === undefined) {
        throw "Could not find metric visualizer";
    }
    return visualizer;
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function deleteDatabaseDefaults(driver) {
    await deleteTagService(driver, "Default local tags");
    await deleteTaggableService(driver, "Default local taggables");
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} keys
 */
export async function sendKeys(driver, keys) {
    const actions = driver.actions({async: true});
    await actions.sendKeys(keys).perform();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {WebElement} element 
 */
export async function mouseOver(driver, element) {
    const actions = driver.actions({async: true});
    await actions.move({origin: element, x: 0, y: 0, duration: 0}).perform();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {IDirection} direction 
 */
export async function mouseMove(driver, direction) {
    const actions = driver.actions({async: true});
    await actions.move({origin: Origin.VIEWPORT, x: direction.x, y: direction.y, duration: 0}).perform();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {WebElement} element 
 */
export async function mouseDown(driver, element) {
    const actions = driver.actions({async: true});
    await actions.move({origin: element, x: 0, y: 0, duration: 0}).perform();
    await actions.press(Button.LEFT).perform();
}

/**
 * @param {ThenableWebDriver} driver
 */
export async function mouseUp(driver) {
    const actions = driver.actions({async: true});
    await actions.release(Button.LEFT).perform();
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {WebElement} element 
 * @param {IDirection} direction 
 */
export async function drag(driver, element, direction) {
    await mouseDown(driver, element);
    await mouseMove(driver, direction);
    await mouseUp(driver);
}

/**
 * @param {ThenableWebDriver} driver
 * @param {WebElement} element 
 */
export async function doubleClick(driver, element) {
    const actions = driver.actions({async: true});
    await actions.doubleClick(element).perform();
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {number} deltaY 
 */
export async function scroll(driver, element, deltaY, scrollCount) {
    await driver.executeAsyncScript(`
        const element = arguments[0];
        const deltaY = arguments[1];
        const scrollCount = arguments[2];
        
        for (let i = 0; i < scrollCount; ++i) {
            element.dispatchEvent(new WheelEvent('wheel', {view: window, bubbles: true, cancelable: true, clientX: 0, clientY: 0, deltaY}));
        };
        arguments[arguments.length - 1]();
    `, element, deltaY, scrollCount);
}

/**
 * @typedef {Object} XPathHelper
 * @property {string=} type
 * @property {string=} descendentContainsText
 * @property {string=} containsText
 * @property {string=} notContainsText
 * @property {(string | string[])=} containsClass
 * @property {Map<string, string>=} dataContains
 * @property {string=} hasClass
 * @property {string=} hasID
 * @property {string=} hasValue
 * @property {string=} valueContains
 * @property {(string | boolean)=} hasTitle
 * @property {string=} hasInputType
 * @property {boolean=} isDisabled
 * @property {number=} nthParent
 * @property {XPathHelper=} descendent
 */

/**
 * @param {XPathHelper} options 
 */
function xpathHelper_(options) {
    options ??= {};
    options.type ??= "*";

    let xpath = `//${options.type}`;
    const xpathSpecifiers = [];
    if (options.descendentContainsText) {
        xpathSpecifiers.push(`contains(.,"${options.descendentContainsText}")`);
    }
    if (options.containsText) {
        xpathSpecifiers.push(`text()[contains(.,"${options.containsText}")]`);
    }
    if (options.notContainsText) {
        xpathSpecifiers.push(`not(text()[contains(.,"${options.notContainsText}")])`);
    }
    if (options.hasClass) {
        xpathSpecifiers.push(`@class="${options.hasClass}"`);
    }
    if (options.containsClass) {
        if (!(options.containsClass instanceof Array)) {
            options.containsClass = [options.containsClass];
        }
        for (const containsClass of options.containsClass) {
            xpathSpecifiers.push(`contains(@class, "${containsClass}")`);
        }
    }
    if (options.hasID) {
        xpathSpecifiers.push(`@id="${options.hasID}"`);
    }
    if (options.hasValue) {
        xpathSpecifiers.push(`@value="${options.hasValue}"`);
    }
    if (options.valueContains) {
        xpathSpecifiers.push(`contains(@value, "${options.valueContains}")`);
    }
    if (options.hasTitle) {
        if (options.hasTitle === true) {
            xpathSpecifiers.push(`boolean(@title)`);
        } else {
            xpathSpecifiers.push(`@title="${options.hasTitle}"`)
        }
    }
    if (options.hasInputType) {
        xpathSpecifiers.push(`@type="${options.hasInputType}"`);
    }
    if (options.dataContains) {
        for (const [key, value] of options.dataContains) {
            xpathSpecifiers.push(`contains(@${key}, "${value}")`);
        }
    }
    if (options.isDisabled) {
        xpathSpecifiers.push(`@disabled=${options.isDisabled}`);
    }
    let descendent = "";
    if (options.descendent) {
        descendent = `/descendant::${xpathHelper_(options.descendent).slice(2)}`;
    }
    let parent = "";
    if (options.nthParent) {
        for (let i = 0; i < options.nthParent; ++i) {
            parent += "/parent::*";
        }
    }
    let xpathSpecifier = "";
    if (xpathSpecifiers.length > 0) {
        xpathSpecifier = `[${xpathSpecifiers.join(" and ")}]`;
    }

    return xpath + xpathSpecifier + descendent + parent;
}

/**
 * @param {XPathHelper} options 
 */
export function xpathHelper(options) {
    const xpath = xpathHelper_(options);
    return By.xpath(xpath);
}

const QUERY_RATE = 100;
/**
 * @param {string} filePath
 * @param {number} timeout
 */
export async function checkForDownload(filePath, timeout) {
    return new Promise(resolve => {
        const rejectionTimeout = setTimeout(() => {
            resolve(false);
        }, timeout);

        const interval = setInterval(() => {
            if (existsSync(path.join(DOWNLOAD_DIRECTORY, filePath))) {
                clearInterval(interval);
                clearTimeout(rejectionTimeout);
                resolve(true);
            }
        }, QUERY_RATE);
    });
}

/**
 * @param {Locator} locator
 * @param {number} count
 */
export function untilCountElementsLocatedNotEquals(locator, count) {
    /**
     * @param {ThenableWebDriver} driver 
     */
    const untilElementsNotLocatedCallback = async (driver) => {
        return (await driver.findElements(locator)).length !== count;
    }
    return untilElementsNotLocatedCallback;
}

/**
 * @param {Locator} locator
 * @param {number} count
 */
export function untilCountElementsLocated(locator, count) {
    /**
     * @param {ThenableWebDriver} driver 
     */
    const untilElementsNotLocatedCallback = async (driver) => {
        return (await driver.findElements(locator)).length === count;
    }
    return untilElementsNotLocatedCallback;
}

/**
 * @param {Locator} locator 
 */
export function untilElementsNotLocated(locator) {
    return untilCountElementsLocated(locator, 0);
}

export function referenceDownloadedFile(filePath) {
    return path.resolve(path.join(DOWNLOAD_DIRECTORY, filePath));
}

/**
 * @param {string} filePath 
 */
export async function readDownloadedFile(filePath) {
    return await readFile(referenceDownloadedFile(filePath), {encoding: "binary"});
}

/**
 * @param {string} filePath 
 */
export async function rmDownloadedFile(filePath) {
    await rm(referenceDownloadedFile(filePath));
}

/**
 * @param {WebElement} element 
 */
export async function realFocus(element) {
    const driver = element.getDriver();
    await driver.executeAsyncScript("window.focus(); arguments[arguments.length - 1]();");
    await driver.actions().move({origin: element}).click().perform();
}
/**
 * @param {WebElement} element 
 */
export async function realClear(element) {
    await element.sendKeys(Key.CONTROL, "a", Key.BACK_SPACE, Key.NULL);
}