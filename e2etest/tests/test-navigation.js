import { createNewFileSearchPage } from "../functionality/pages-functionality.js";
import { ByModal, closeModal, closePage, DEFAULT_TIMEOUT_TIME, findPages, rmDownloadedFile, selectPage, xpathHelper } from "../helpers.js";
import { navigateToBackup, navigateToHydrusImport, navigateToImportMappingsFromBackup } from "../navigation/file-navigation.js";
import { navigateToChangeTagToMetric, navigateToCreateMetricService, navigateToCreateNewMetric, navigateToModifyMetric, navigateToModifyMetricServices } from "../navigation/metrics-navigation.js";
import { navigateToDuplicatesProcessingPage, navigateToFileSearchPage } from "../navigation/pages-navigation.js";
import { navigateToCreateLocalDownloaderService, navigateToCreateNewURLParser, navigateToModifyLocalDownloaderServices, navigateToModifyURLParser } from "../navigation/parsers-navigation.js";
import { navigateToCreateTaggableService, navigateToModifyTaggableServices } from "../navigation/taggables-navigation.js";
import { navigateToCreateTagService, navigateToModifyTagServices } from "../navigation/tags-navigation.js";
import { until } from "selenium-webdriver";

/** @import {ThenableWebDriver} from "selenium-webdriver" */
/** @import {TestSuite} from "./test-suites.js" */


/** @type {TestSuite[]} */
export const NAVIGATE_FILES_MENU_TESTS = [
    {name: "NavigateToHydrusImport", tests: async (driver) => {
        await navigateToHydrusImport(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToImportMappingsFromBackup", tests: async (driver) => {
        await navigateToImportMappingsFromBackup(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToBackup", tests: async (driver) => {
        await navigateToBackup(driver);
        await rmDownloadedFile("garo-backup.json");
    }},
];

/** @type {TestSuite[]} */
export const NAVIGATE_PAGES_MENU_TESTS = [
    {name: "NavigateToFileSearchPage", tests: async (driver) => {
        await navigateToFileSearchPage(driver);
        await closePage(driver);
    }},
    {name: "NavigateToDuplicatesProcessingPage", tests: async (driver) => {
        await navigateToDuplicatesProcessingPage(driver);
        await closePage(driver);
    }}
];

/** @type {TestSuite[]} */
export const NAVIGATE_TAGS_MENU_TESTS = [
    {name: "NavigateToCreateTagService", tests: async (driver) => {
        await navigateToCreateTagService(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToModifyTagServices", tests: async (driver) => {
        await navigateToModifyTagServices(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
];

/** @type {TestSuite[]} */
export const NAVIGATE_TAGGABLES_MENU_TESTS = [
    {name: "NavigateToCreateTaggableService", tests: async (driver) => {
        await navigateToCreateTaggableService(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToModifyTaggableServices", tests: async (driver) => {
        await navigateToModifyTaggableServices(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
];

/** @type {TestSuite[]} */
export const NAVIGATE_METRICS_MENU_TESTS = [
    {name: "NavigateToCreateMetricService", tests: async (driver) => {
        await navigateToCreateMetricService(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToModifyMetricServices", tests: async (driver) => {
        await navigateToModifyMetricServices(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToCreateNewMetric", tests: async (driver) => {
        await navigateToCreateNewMetric(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToModifyMetric", tests: async (driver) => {
        await navigateToModifyMetric(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToChangeTagToMetric", tests: async (driver) => {
        await navigateToChangeTagToMetric(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }}
];

/** @type {TestSuite[]} */
export const NAVIGATE_PARSERS_MENU_TESTS = [
    {name: "NavigateToCreateNewLocalDownloaderService", tests: async (driver) => {
        await navigateToCreateLocalDownloaderService(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToModifyLocalDownloaderService", tests: async (driver) => {
        await navigateToModifyLocalDownloaderServices(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToCreateNewURLParser", tests: async (driver) => {
        await navigateToCreateNewURLParser(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
    {name: "NavigateToModifyURLParser", tests: async (driver) => {
        await navigateToModifyURLParser(driver);
        await driver.wait(until.elementLocated(ByModal), DEFAULT_TIMEOUT_TIME);
        await closeModal(driver);
    }},
];

/** @type {TestSuite[]} */
export const NAVIGATE_PAGE_NAVBAR_MENU_TESTS = [
    {name: "MultipartTest", tests: [
        {name: "CreateFileSearchPages", tests: async (driver) => {
            await createNewFileSearchPage(driver);
            await createNewFileSearchPage(driver);
            await createNewFileSearchPage(driver);
            await createNewFileSearchPage(driver);
        }},
        {name: "SelectPages", tests: async (driver) => {
            await selectPage(driver, 0);
            await selectPage(driver, 1);
            await selectPage(driver, 2);
            await selectPage(driver, 3);
            await selectPage(driver, 2);
            await selectPage(driver, 1);
            await selectPage(driver, 0);
        }},
        {name: "DeleteFileSearchPages", tests: async (driver) => {
            await closePage(driver);
            await selectPage(driver, 2);
            await closePage(driver);
            await closePage(driver);
            await closePage(driver);
            if ((await findPages(driver)).length !== 0) {
                throw "Page still visible after closing all pages";
            }
        }},
    ]},
];

export const NAVIGATION_TESTS = /** @type {const} */ ([
    {name: "FileMenu", tests: NAVIGATE_FILES_MENU_TESTS},
    {name: "PagesMenu", tests: NAVIGATE_PAGES_MENU_TESTS},
    {name: "TagsMenu", tests: NAVIGATE_TAGS_MENU_TESTS},
    {name: "TaggablesMenu", tests: NAVIGATE_TAGGABLES_MENU_TESTS},
    {name: "MetricsMenu", tests: NAVIGATE_METRICS_MENU_TESTS},
    {name: "ParsersMenu", tests: NAVIGATE_PARSERS_MENU_TESTS},
    {name: "PageNavbarMenu", tests: NAVIGATE_PAGE_NAVBAR_MENU_TESTS}
]);