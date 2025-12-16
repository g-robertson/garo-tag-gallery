import { createNewFileSearchPage } from "../functionality/pages-functionality.js";
import { closeModal, closePage, findModals, findPages, rmDownloadedFile, selectPage, xpathHelper } from "../helpers.js";
import { navigateToBackup, navigateToHydrusImport, navigateToImportMappingsFromBackup } from "../navigation/file-navigation.js";
import { navigateToChangeTagToMetric, navigateToCreateMetricService, navigateToCreateNewMetric, navigateToModifyMetric, navigateToModifyMetricServices } from "../navigation/metrics-navigation.js";
import { navigateToFileSearchPage } from "../navigation/pages-navigation.js";
import { navigateToCreateTaggableService, navigateToModifyTaggableServices } from "../navigation/taggables-navigation.js";
import { navigateToCreateTagService, navigateToModifyTagServices } from "../navigation/tags-navigation.js";

/** @import {ThenableWebDriver} from "selenium-webdriver" */
/** @import {TestSuite} from "./test-suites.js" */


/** @type {TestSuite[]} */
export const NAVIGATE_FILES_MENU_TESTS = [
    {name: "NavigateToHydrusImport", tests: async (driver) => {
        await navigateToHydrusImport(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to import files from hydrus";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToImportMappingsFromBackup", tests: async (driver) => {
        await navigateToImportMappingsFromBackup(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to import files from hydrus";
        }
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
];

/** @type {TestSuite[]} */
export const NAVIGATE_TAGS_MENU_TESTS = [
    {name: "NavigateToCreateTagService", tests: async (driver) => {
        await navigateToCreateTagService(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to create new tag service";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToModifyTagServices", tests: async (driver) => {
        await navigateToModifyTagServices(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to modify tag service";
        }
        await closeModal(driver);
    }},
];

/** @type {TestSuite[]} */
export const NAVIGATE_TAGGABLES_MENU_TESTS = [
    {name: "NavigateToCreateTaggableService", tests: async (driver) => {
        await navigateToCreateTaggableService(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to create new taggable service";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToModifyTaggableServices", tests: async (driver) => {
        await navigateToModifyTaggableServices(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to modify taggable service";
        }
        await closeModal(driver);
    }},
];

/** @type {TestSuite[]} */
export const NAVIGATE_METRICS_MENU_TESTS = [
    {name: "NavigateToCreateMetricService", tests: async (driver) => {
        await navigateToCreateMetricService(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to create new metric service";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToModifyMetricServices", tests: async (driver) => {
        await navigateToModifyMetricServices(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to modify metric service";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToCreateNewMetric", tests: async (driver) => {
        await navigateToCreateNewMetric(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to create new metric";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToModifyMetric", tests: async (driver) => {
        await navigateToModifyMetric(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to modify metric";
        }
        await closeModal(driver);
    }},
    {name: "NavigateToChangeTagToMetric", tests: async (driver) => {
        await navigateToChangeTagToMetric(driver);
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to change tag to metric";
        }
        await closeModal(driver);
    }}
];

/** @type {TestSuite[]} */
export const NAVIGATE_PARSERS_MENU_TESTS = [
    {name: "NavigateToCreateNewURLGeneratorService", tests: async (driver) => {
        await driver.findElement(xpathHelper({attrContains: {"text": "Parsers", "class": "topbar-dropdown-title"}})).click();

        await driver.findElement(xpathHelper({attrContains: {"text": "Create new URL generator service", "class": "topbar-dropdown-option"}})).click();
        if ((await findModals(driver)).length === 0) {
            throw "Modal not visible after navigating to create new URL generator service";
        }
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