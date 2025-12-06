import { until } from "selenium-webdriver";
import { deleteBackupedFiles, killServer, spawnServer } from "../../server.js";
import { authenticate } from "../authenticate.js";
import { closeModal, deleteDatabaseDefaults, readDownloadedFile, referenceDownloadedFile, UNTIL_JOB_BEGIN, UNTIL_JOB_END } from "../../helpers.js";
import { createBackupAsFile, createBackupAsText, importMappingsFromBackupFile } from "../../functionality/file-functionality.js";

/** @import {TestSuite} from "../test-suites.js" */


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
        await driver.wait(UNTIL_JOB_BEGIN);
        await closeModal(driver);
        await driver.wait(UNTIL_JOB_END);
        
        const backupPostBackup = await createBackupAsText(driver);
        if (backupOriginal.length !== backupPostBackup.length) {
            throw "Original backup does not match backup generated after loading from backup";
        }
    }},
]

export const FILES_TESTS = [
    {name: "Backup", tests: BACKUP_TESTS}
];