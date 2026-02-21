import { until } from "selenium-webdriver";
import { deleteBackupedFiles, killServer, spawnServer } from "../../server.js";
import { authenticate } from "../authenticate.js";
import { ByMultiSelectOption, BySelectableTag, closeJobError, closeModal, closePage, CREATE_HYDRUS_JOB_TIMEOUT, DEFAULT_TIMEOUT_TIME, deleteDatabaseDefaults, FINISH_HYDRUS_JOB_TIMEOUT, readDownloadedFile, referenceDownloadedFile, selectPage, UNTIL_JOB_BEGIN, UNTIL_JOB_END, UNTIL_JOB_ERROR, untilElementsNotLocated, xpathHelper } from "../../helpers.js";
import { createBackupAsFile, createBackupAsText, importFilesFromHydrus, importMappingsFromBackupFile } from "../../functionality/file-functionality.js";
import { BUG_PRIORITIES, BUG_NOTICES, BUG_IMPACTS, IMPLEMENTATION_DIFFICULTIES } from "../../unimplemented-test-info.js";
import { createNewTagService, deleteTagService } from "../../functionality/tags-functionality.js";
import { createNewTaggableService, deleteTaggableService } from "../../functionality/taggables-functionality.js";
import { navigateToHydrusImport } from "../../navigation/file-navigation.js";
import { navigateToFileSearchPage } from "../../navigation/pages-navigation.js";

import path from "path";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_TAG_SERVICE_NAME_1 = "TEST TAG SERVICE";
const TEST_TAGGABLE_SERVICE_NAME_1 = "TEST TAGGABLE SERVICE";
const TEST_HYDRUS_IMPORT_FILE_NAME = "./e2etest/data/hydrus-test-import.zip";
const TEST_HYDRUS_TEXT_FILE_FILE_NAME = "./e2etest/data/hydrus-test-text-file-import.zip"
const TEST_HYDRUS_BAD_THUMBNAIL_FILE_NAME = "./e2etest/data/hydrus-test-bad-thumbnail-import.zip"
const TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_1 = "./e2etest/data/hydrus-test-multipart-import.zip.001";
const TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_2 = "./e2etest/data/hydrus-test-multipart-import.zip.002";
const TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_3 = "./e2etest/data/hydrus-test-multipart-import.zip.003";
const SINGLE_IMAGE_IMPORT = "./e2etest/data/single-image-test.zip";

const TEST_PAGE_UPDATE_TAG_SERVICE = "TEST PAGE UPDATE TAG SERVICE";
const TEST_SERVER_REFRESH_TAG_SERVICE = "TEST SERVER REFRESH TAG SERVICE";
const TEST_PAGE_UPDATE_TAG = "1girl";
const TEST_SERVER_REFRESH_TAG = "test-server-refresh";

/** @type {TestSuite[]} */
const IMPORT_FILES_FROM_HYDRUS_TESTS = [
    {name: "TestImportFilesFromHydrus", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await navigateToFileSearchPage(driver);
            await selectPage(driver, 0);
            await createNewTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await createNewTaggableService(driver, TEST_TAGGABLE_SERVICE_NAME_1);
            await driver.findElement(ByMultiSelectOption("All")).click();
            await driver.wait(untilElementsNotLocated(BySelectableTag()), DEFAULT_TIMEOUT_TIME);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await deleteTaggableService(driver, TEST_TAGGABLE_SERVICE_NAME_1);
            await closePage(driver);
        }},
        {name: "TestImportFilesFromHydrusWorks", tests: [
            {name: "ImportingWorks", tests: async (driver) => {
                await importFilesFromHydrus(driver, {
                    fileName: TEST_HYDRUS_IMPORT_FILE_NAME,
                    taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                    tagServiceName: TEST_TAG_SERVICE_NAME_1
                });
                await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
                await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
            }},
            {name: "ImportingWorksWithExistingDataOnServerRefresh", tests: async (driver) => {
                await killServer();
                await spawnServer();
                
                await createNewTagService(driver, TEST_SERVER_REFRESH_TAG_SERVICE);
                await driver.findElement(ByMultiSelectOption(TEST_SERVER_REFRESH_TAG_SERVICE)).click();

                await importFilesFromHydrus(driver, {
                    fileName: SINGLE_IMAGE_IMPORT,
                    tagServiceName: TEST_SERVER_REFRESH_TAG_SERVICE
                });
                await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
                await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
                await driver.wait(until.elementLocated(BySelectableTag(TEST_SERVER_REFRESH_TAG)), DEFAULT_TIMEOUT_TIME);

                await deleteTagService(driver, TEST_SERVER_REFRESH_TAG_SERVICE);
            }},
            {name: "ImportingWithOpenPageShouldUpdatePage", tests: async (driver) => {
                await createNewTagService(driver, TEST_PAGE_UPDATE_TAG_SERVICE);
                await driver.findElement(ByMultiSelectOption(TEST_PAGE_UPDATE_TAG_SERVICE)).click();

                await importFilesFromHydrus(driver, {
                    fileName: TEST_HYDRUS_IMPORT_FILE_NAME,
                    taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                    tagServiceName: TEST_PAGE_UPDATE_TAG_SERVICE
                });
                await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
                await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
                await driver.wait(until.elementLocated(BySelectableTag(TEST_PAGE_UPDATE_TAG)), DEFAULT_TIMEOUT_TIME);

                await deleteTagService(driver, TEST_PAGE_UPDATE_TAG_SERVICE);
            }},
            {name: "EmptySubmitShouldGiveProperMessage", tests: async (driver) => {
                await importFilesFromHydrus(driver, {
                    fileNameGroups: [],
                    taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                    tagServiceName: TEST_TAG_SERVICE_NAME_1
                });
                await driver.wait(untilElementsNotLocated(xpathHelper({attrContains: {"text": "Error"}})));
            }},
            {name: "IncompleteZIPShouldNotCrash", tests: async (driver) => {
                await importFilesFromHydrus(driver, {
                    fileNames: [TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_1, TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_2],
                    taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                    tagServiceName: TEST_TAG_SERVICE_NAME_1
                });
                await driver.wait(UNTIL_JOB_ERROR, FINISH_HYDRUS_JOB_TIMEOUT);
                await closeJobError(driver);
            }},
            {name: "TextFileShouldNotCrash", tests: async (driver) => {
                await importFilesFromHydrus(driver, {
                    fileName: TEST_HYDRUS_TEXT_FILE_FILE_NAME,
                    taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                    tagServiceName: TEST_TAG_SERVICE_NAME_1
                });
                await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
                await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
            }},
            {name: "UnthumbnailableFileShouldNotCrash", tests: async (driver) => {
                await importFilesFromHydrus(driver, {
                    fileName: TEST_HYDRUS_BAD_THUMBNAIL_FILE_NAME,
                    taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                    tagServiceName: TEST_TAG_SERVICE_NAME_1
                });
                await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
                await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
            }},
            {name: "NOT_PARTIALShouldNotAppear", tests: async (driver) => {
                await navigateToHydrusImport(driver);
                await driver.wait(untilElementsNotLocated(xpathHelper({attrContains: {"value": "__NOT_PARTIAL__"}})), DEFAULT_TIMEOUT_TIME);
                await closeModal(driver);
            }}
        ]},
    ]},
    {name: "TestMultipartZipHydrusImport", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await createNewTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await createNewTaggableService(driver, TEST_TAGGABLE_SERVICE_NAME_1);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await deleteTaggableService(driver, TEST_TAGGABLE_SERVICE_NAME_1);
        }},
        {name: "TestMultipartZipHydrusImportWorks", tests: async (driver) => {
            await importFilesFromHydrus(driver, {
                partialUploadLocation: "TEST_HYDRUS_PARTIAL_UPLOAD_LOCATION",
                fileNameGroups: [[TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_1], [TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_2, TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_3]],
                taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                tagServiceName: TEST_TAG_SERVICE_NAME_1
            });
            await driver.wait(UNTIL_JOB_BEGIN, CREATE_HYDRUS_JOB_TIMEOUT);
            await driver.wait(UNTIL_JOB_END, FINISH_HYDRUS_JOB_TIMEOUT);
        }},
        {name: "TestPartsAppearDuringImport", tests: async (driver) => {
            await importFilesFromHydrus(driver, {
                partialUploadLocation: "TEST_HYDRUS_PARTIAL_UPLOAD_LOCATION_2",
                fileNameGroups: [[TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_1, TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_2]],
                taggableServiceName: TEST_TAGGABLE_SERVICE_NAME_1,
                tagServiceName: TEST_TAG_SERVICE_NAME_1,
                finish: false
            });
            await driver.wait(until.elementsLocated(xpathHelper({type: "option", attrContains: {text: path.basename(TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_1)}})), DEFAULT_TIMEOUT_TIME);
            await driver.wait(until.elementsLocated(xpathHelper({type: "option", attrContains: {text: path.basename(TEST_HYDRUS_MULTIPART_IMPORT_FILE_NAME_2)}})), DEFAULT_TIMEOUT_TIME);
            await closeModal(driver);
        }}
    ]}
];

/** @type {TestSuite[]} */
const BACKUP_TESTS = [
    {name: "BackupEqualsImportBackup", tests: async (driver) => {
        const backupOriginalFile = await createBackupAsFile(driver);
        const backupOriginal = await readDownloadedFile(backupOriginalFile);
    
        await killServer();
        await deleteBackupedFiles();
        const accessKey = await spawnServer();
        await authenticate(driver, process.env.PORT, accessKey);
        await deleteDatabaseDefaults(driver);
    
        await importMappingsFromBackupFile(driver, referenceDownloadedFile(backupOriginalFile));
        await driver.wait(UNTIL_JOB_BEGIN, DEFAULT_TIMEOUT_TIME * 5);
        await closeModal(driver);
        await driver.wait(UNTIL_JOB_END);
        
        const backupPostBackup = await createBackupAsText(driver);
        if (backupOriginal.length !== backupPostBackup.length) {
            throw "Original backup does not match backup generated after loading from backup";
        }
    }},
]

export const FILES_TESTS = [
    {name: "ImportFilesFromHydrus", tests: IMPORT_FILES_FROM_HYDRUS_TESTS},
    {name: "Backup", tests: BACKUP_TESTS}
];