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
    await page.findElement(By.className("page-cancel")).click();
}

/**
 * @param {ThenableWebDriver} driver 
 */
export async function closeJobError(driver) {
    await driver.findElement(By.className("job-error-cancel")).click();
}

export const BY_THUMBNAIL_GALLERY_IMAGE = xpathHelper({attrContains: {"class": "thumbnail-gallery-item"}, nthParent: 1});

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

export const BY_GALLERY_IMAGE = xpathHelper({attrContains: {"class": "gallery-content"}});
export const BY_DEDUPE_PREVIEW_GALLERY_IMAGE = xpathHelper({attrContains: {"class": "dedupe-preview-gallery-item"}, nthParent: 1});

/**
 * @param {ThenableWebDriver} driver 
 * @param {number=} imageNumber
 */
export async function findDedupePreviewGalleryImages(driver) {
    return await driver.findElements(BY_DEDUPE_PREVIEW_GALLERY_IMAGE);
}

/**
 * @param {ThenableWebDriver} driver 
 * @param {number=} imageNumber
 */
export async function findDedupePreviewGalleryImage(driver, imageNumber) {
    imageNumber ??= 0;
    const images = await findDedupePreviewGalleryImages(driver);
    return images[imageNumber];
}

export const BY_DEDUPE_GALLERY_IMAGE = xpathHelper({attrContains: {"class": "gallery-content"}});

/**
 * @param {ThenableWebDriver} driver 
 */
export async function findDedupeGalleryImage(driver) {
    const image = await driver.findElement(BY_DEDUPE_GALLERY_IMAGE);
    return image;
}

/**
 * @param {string} tag 
 */
export function BySearchTag(tag) {
    return xpathHelper({attrContains: {"class": "tag-search-query"}, descendent: {
        attrContains: {"class": "lazy-selector-selectable-item"},
        attrEq: {"title": tag},
        attrExists: ["title"]
    }});
}

/**
 * @param {string} tag 
 */
export function BySelectableTag(tag) {
    return xpathHelper({attrContains: {"class": "local-tags-selector"}, descendent: {
        attrContains: {"class": "lazy-selector-selectable-item"},
        attrEq: {"title": tag},
        attrExists: ["title"],
    }});
}

export function BySelectedTag() {
    return xpathHelper({attrContains: {"class": "local-tags-selector"}, descendent: {
        attrContains: {"class": ["lazy-selector-selectable-item", "selected"]},
        attrExists: ["title"],
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
    return xpathHelper({attrContains: {"class": options.ancestorWithClass}, descendent: {
        attrContains: {"class": "multiselect-option"},
        descendentContainsText: multiSelectOption,
        descendent: {
            type: "input"
        }
    }});
}

export const CREATE_HYDRUS_JOB_TIMEOUT = 1000;
export const FINISH_HYDRUS_JOB_TIMEOUT = 5000;
export const UNTIL_JOB_BEGIN = until.elementLocated(By.className("job"));
export const UNTIL_JOB_END = untilElementsNotLocated(By.className("job"));
export const UNTIL_JOB_ERROR = until.elementLocated(By.className("job-error"));

/**
 * @param {ThenableWebDriver} driver 
 * @param {string} option 
 */
export async function pressDialogBoxOption(driver, option) {
    await driver.findElement(xpathHelper({attrContains: {"class": "dialog-box-modal"}, descendent: {type: "input", attrEq: {value: option}}})).click();
}

/**
 * @param {WebElement} localTagsSelector
 */
export async function untilLocalTagsSelectorRefresh(localTagsSelector) {
    const tagSelectableItem = await localTagsSelector.findElement(xpathHelper({attrContains: {"class": "lazy-selector-selectable-item"}}));
    const reactRef = await tagSelectableItem.getAttribute("data-react-ref");
    return untilElementsNotLocated(xpathHelper({attrContains: {"data-react-ref": reactRef}}));
}

/**
 * @param {ThenableWebDriver} driver
 * @param {string} metricName
 * @param {number} starCount
 */
export async function findMetricVisualizer(driver, metricName, starCount) {
    const starIndex = starCount - 1;
    const visualizers = await driver.findElements(xpathHelper({attrContains: {"class": "metric-visual-container"}, descendentContainsText: metricName, descendent: {
        attrContains: {"class": "metric-star"}
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
 * @typedef {"title" | "value" | "type" | "class" | "text" | "name"} HTMLAttribute
 */

/**
 * @typedef {Object} XPathHelper
 * @property {string=} type
 * @property {string=} descendentContainsText
 * @property {Record<HTMLAttribute, string | string[]>} attrNotContains
 * @property {Record<HTMLAttribute, string | string[]>} attrContains
 * @property {Record<HTMLAttribute, string>} attrEq
 * @property {HTMLAttribute[]} attrExists
 * @property {boolean=} isDisabled
 * @property {number=} nthParent
 * @property {XPathHelper=} descendent
 * @property {(XPathHelper[] | XPathHelper)=} or
 */

/**
 * @param {XPathHelper} options
 * @returns {string}
 */
function xpathHelper_(options) {
    options ??= {};
    options.type ??= "*";

    let xpath = `//${options.type}`;
    const xpathSpecifiers = [];
    if (options.descendentContainsText) {
        xpathSpecifiers.push(`contains(.,"${options.descendentContainsText}")`);
    }

    if (options.attrEq) {
        for (const [attribute, value] of Object.entries(options.attrEq)) {
            if (value === undefined) {
                continue;
            }

            if (attribute === "text") {
                xpathSpecifiers.push(`text()="${value}"`);
            } else {
                xpathSpecifiers.push(`@${attribute}="${value}"`);
            }
        }
    }

    if (options.attrContains) {
        for (let [attribute, values] of Object.entries(options.attrContains)) {
            if (!(values instanceof Array)) {
                values = [values];
            }

            for (const value of values) {
                if (value === undefined) {
                    continue;
                }
                
                if (attribute === "text") {
                    xpathSpecifiers.push(`text()[contains(.,"${value}")]`);
                } else {
                    xpathSpecifiers.push(`contains(@${attribute}, "${value}")`);
                }
            }
        }
    }

    
    if (options.attrNotContains) {
        for (let [attribute, values] of Object.entries(options.attrNotContains)) {
            if (!(values instanceof Array)) {
                values = [values];
            }

            for (const value of values) {
                if (value === undefined) {
                    continue;
                }
                
                if (attribute === "text") {
                    xpathSpecifiers.push(`not(text()[contains(.,"${value}")])`);
                } else {
                    xpathSpecifiers.push(`not(contains(@${attribute}, "${value}"))`);
                }
            }
        }
    }

    if (options.attrExists) {
        for (const attribute of options.attrExists) {
            xpathSpecifiers.push(`boolean(@${attribute})`);
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

    options.or ??= [];
    if (!(options.or instanceof Array)) {
        options.or = [options.or];
    }

    const self = xpath + xpathSpecifier + descendent + parent;
    const allElements = [self, ...options.or.map(helperObj => xpathHelper_(helperObj))];

    return allElements.join("|");
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
 * @param {ThenableWebDriver} driver
 * @param {WebElement} element 
 */
export async function mouseOver(driver, element) {
    await driver.actions({async: true}).move({origin: element, x: 0, y: 0, duration: 0}).perform();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {IDirection} direction 
 */
export async function mouseMove(driver, direction) {
    await driver.actions({async: true}).move({origin: Origin.VIEWPORT, x: direction.x, y: direction.y, duration: 0}).perform();
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
    await driver.actions({async: true}).release(Button.LEFT).perform();
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
 * 
 * @param {ThenableWebDriver} driver 
 * @param {WebElement} element 
 * @param {{
 *     shift?: boolean
 *     ctrl?: boolean
 * }} options 
 */
export async function modClick(driver, element, options) {
    options ??= {};
    options.ctrl ??= false;
    options.shift ??= false;

    await driver.executeAsyncScript(`
        const element = arguments[0];
        const ctrlKey = arguments[1];
        const shiftKey = arguments[2];
        
        element.dispatchEvent(new MouseEvent('click', {view: window, bubbles: true, ctrlKey, shiftKey}));
        arguments[arguments.length - 1]();
    `, element, options.ctrl, options.shift);
}

/**
 * 
 * @param {ThenableWebDriver} driver 
 * @param {WebElement} element 
 * @param {{
 *     shift?: boolean
 *     ctrl?: boolean
 * }} options 
 */
export async function modDoubleClick(driver, element, options) {
    options.ctrl ??= false;
    options.shift ??= false;

    await driver.executeAsyncScript(`
        const element = arguments[0];
        const ctrlKey = arguments[1];
        const shiftKey = arguments[2];
        
        element.dispatchEvent(new MouseEvent('dblclick', {view: window, bubbles: true, ctrlKey, shiftKey}));
        arguments[arguments.length - 1]();
    `, element, options.ctrl, options.shift);
}
/**
 * @param {ThenableWebDriver} driver
 * @param {WebElement} element 
 */
export async function doubleClick(driver, element) {
    await driver.actions({async: true}).doubleClick(element).perform();
}

/**
 * @param {ThenableWebDriver} driver
 * @param {WebElement} element
 * @param {number} deltaY 
 * @param {number} scrollCount
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
 * @param {ThenableWebDriver} driver
 * @param {string} keys
 */
export async function sendKeys(driver, keys) {
    await driver.actions({async: true}).sendKeys(keys).perform();
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