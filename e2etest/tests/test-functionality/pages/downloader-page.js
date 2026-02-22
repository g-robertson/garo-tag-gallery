import { BUG_IMPACTS, BUG_NOTICES, BUG_PRIORITIES, IMPLEMENTATION_DIFFICULTIES } from "../../../unimplemented-test-info.js";
import { BySelectableDownloaderQuery, createNewDownloaderPage, downloadFromURL, enterDownloaderName, enterDownloaderURL, setDownloaderFileCountLimit, toggleDownloaderBeginPaused, toggleSelectedDownloaderPaused, watchURL } from "../../../functionality/pages/downloader-page.functionality.js";
import { BY_THUMBNAIL_GALLERY_IMAGE, closePage, untilCountElementsLocated } from "../../../helpers.js";
import { until } from "selenium-webdriver";
/** @import {TestSuite} from "../../test-suites.js" */


/** @type {Record<string, any>} */
const State = {};

const MOCK_DATA_WEB_SERVER_URL = "http://localhost:3009";

const MOCK_DATA_STANDALONE_IMAGE = "galleries/standalone-image/standalone-image.png";
const MOCK_DATA_GALLERY_4_ITEMS_PATH = "galleries/4-items-gallery.html";
const MOCK_DATA_WATCHER_GALLERY = "galleries/watcher-gallery";
const MOCK_DATA_GALLERY_3_ITEMS_PATH = "galleries/3-items-gallery.html";

/** @type {TestSuite[]} */
export const DOWNLOADER_PAGE_TESTS = [
    {name: "Setup", isSetup: true, tests: async (driver) => {
        await createNewDownloaderPage(driver);
    }},
    {name: "Teardown", isTeardown: true, tests: async (driver) => {
        await closePage(driver);
    }},
    {name: "WithDownloaderPage", tests: [
        /*
        {name: "UnclassifiedDirectImageURLShouldImportImageOnURL", tests: async (driver) => {
            await enterDownloaderURL(driver, `${MOCK_DATA_WEB_SERVER_URL}/${MOCK_DATA_STANDALONE_IMAGE}`);
            await downloadFromURL(driver);
            await enterDownloaderName(driver, "direct image import");
            await driver.wait(until.elementLocated(BySelectableDownloaderQuery(`direct image import - 1 Item - Complete`)))
            await driver.wait(until.elementLocated(BY_THUMBNAIL_GALLERY_IMAGE));
        }},
        {name: "UnclassifiedURLShouldImportAllImagesOnURL", tests: async (driver) => {
            await enterDownloaderURL(driver, `${MOCK_DATA_WEB_SERVER_URL}/${MOCK_DATA_GALLERY_4_ITEMS_PATH}`);
            await downloadFromURL(driver);
            await enterDownloaderName(driver, "import all images on url");
            await driver.wait(until.elementLocated(BySelectableDownloaderQuery(`import all images on url - 4 Items - Complete`)))
            await driver.wait(untilCountElementsLocated(BY_THUMBNAIL_GALLERY_IMAGE, 4));
        }},
        {name: "WatcherShouldImportNewImagesOnWatchTimeRefresh", tests: async (driver) => {
            await enterDownloaderURL(driver, `${MOCK_DATA_WEB_SERVER_URL}/${MOCK_DATA_WATCHER_GALLERY}`);
            await watchURL(driver);
            await enterDownloaderName(driver, "watcher download");
            await driver.wait(until.elementLocated(BySelectableDownloaderQuery(`watcher download - 1 Item - Watching`)));
            await driver.wait(untilCountElementsLocated(BY_THUMBNAIL_GALLERY_IMAGE, 1));
            await forceRewatch(driver);
            await driver.wait(until.elementLocated(BySelectableDownloaderQuery(`watcher download - 2 Items - Watching`)));
            await driver.wait(untilCountElementsLocated(BY_THUMBNAIL_GALLERY_IMAGE, 2));
            await forceRewatch(driver);
            await driver.wait(until.elementLocated(BySelectableDownloaderQuery(`watcher download - 3 Items - Watching`)));
            await driver.wait(untilCountElementsLocated(BY_THUMBNAIL_GALLERY_IMAGE, 3));
        }},
        {name: "FileCountLimitWorks", tests: async (driver) => {
            await enterDownloaderURL(driver, `${MOCK_DATA_WEB_SERVER_URL}/${MOCK_DATA_GALLERY_3_ITEMS_PATH}`);

            await toggleDownloaderBeginPaused(driver);
            await downloadFromURL(driver);
            await toggleDownloaderBeginPaused(driver);

            await setDownloaderFileCountLimit(driver, 2);
            await toggleSelectedDownloaderPaused(driver);

            await enterDownloaderName(driver, "limited download");
            await driver.wait(until.elementLocated(BySelectableDownloaderQuery(`limited download - 2 Items - Limited`)));
            await driver.wait(untilCountElementsLocated(BY_THUMBNAIL_GALLERY_IMAGE, 2));
        }},
        */
    ]}
]