import {spawn} from "child_process"
import { mkdirSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import path from "path";

export const TMP_DB_DIR = `${process.env.DATABASE_DIR}_TMP`
const TEMP_FILE_STORAGE_LOCATION = path.join(TMP_DB_DIR, "file-storage");

async function deleteDB() {
    return await rm(process.env.DATABASE_DIR, {"recursive": true, "force": true});
}

export async function deleteAll() {
    await rm(TEMP_FILE_STORAGE_LOCATION, {"recursive": true, "force": true});
    return await deleteDB();
}

export async function deleteBackupedFiles() {
    await rm(path.join(process.env.DATABASE_DIR, "garo.db"), {force: true});
    await rm(path.join(process.env.DATABASE_DIR, "garo.db-shm"), {force: true});
    await rm(path.join(process.env.DATABASE_DIR, "garo.db-wal"), {force: true});
    await rm(path.join(process.env.DATABASE_DIR, "perf-tags"), {force: true, recursive: true});
}
/** @type {ReturnType<typeof spawn>} */
let server;

export async function spawnServer() {
    return new Promise(resolve => {
        mkdirSync(TMP_DB_DIR, {recursive: true});
        server = spawn("node", ["server.js"], {env: process.env});
        let accessKey;
        server.stdout.on('data', (chunk) => {
            chunk = chunk.toString();
            console.log(`Server stdout: ${chunk}`);
            if (chunk.startsWith("Example app listening on port") && accessKey !== undefined) {
                resolve(accessKey);
            }
            if (chunk.startsWith("The default administrator user access key is:")) {
                accessKey = chunk.slice("The default administrator user access key is: ".length).slice(0, 256);
            }
        });

        server.stderr.on('data', (chunk) => {
            console.log(`Server stderr: ${chunk.toString()}`);
        });
    });
    
}

export async function killServer() {
    return new Promise(resolve => {
        server.on("exit", resolve);
        server.kill();
    });
}