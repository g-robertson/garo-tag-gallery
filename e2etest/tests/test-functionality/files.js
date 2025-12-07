import { until } from "selenium-webdriver";
import { deleteBackupedFiles, killServer, spawnServer } from "../../server.js";
import { authenticate } from "../authenticate.js";
import { closeModal, DEFAULT_TIMEOUT_TIME, deleteDatabaseDefaults, readDownloadedFile, referenceDownloadedFile, UNTIL_JOB_BEGIN, UNTIL_JOB_END } from "../../helpers.js";
import { createBackupAsFile, createBackupAsText, importMappingsFromBackupFile } from "../../functionality/file-functionality.js";
import { BUG_PRIORITIES, BUG_NOTICES, BUG_IMPACTS, IMPLEMENTATION_DIFFICULTIES } from "../../unimplemented-test-info.js";
import { createNewTagService, deleteTagService } from "../../functionality/tags-functionality.js";
import { createNewTaggableService, deleteTaggableService } from "../../functionality/taggables-functionality.js";

/** @import {TestSuite} from "../test-suites.js" */

const TEST_TAG_SERVICE_NAME_1 = "TEST TAG SERVICE";
const TEST_TAGGABLE_SERVICE_NAME_1 = "TEST TAGGABLE SERVICE";

/** @type {TestSuite[]} */
const IMPORT_FILES_FROM_HYDRUS_TESTS = [
    {name: "TestImportFilesFromHydrus", tests: [
        {name: "Setup", isSetup: true, tests: async (driver) => {
            await createNewTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await createNewTaggableService(driver, TEST_TAGGABLE_SERVICE_NAME_1);
        }},
        {name: "Teardown", isTeardown: true, tests: async (driver) => {
            await deleteTagService(driver, TEST_TAG_SERVICE_NAME_1);
            await deleteTaggableService(driver, TEST_TAGGABLE_SERVICE_NAME_1);
        }},
        {name: "TestImportFilesFromHydrusWorks", tests: {
            priority: BUG_PRIORITIES.CURRENT_WORK,
            notice: BUG_NOTICES.ASSUMED_WORKING,
            impact: BUG_IMPACTS.ASSUMED_WORKING,
            expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR
        }}
    ]},
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