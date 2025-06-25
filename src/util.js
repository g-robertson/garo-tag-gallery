import { spawn } from "child_process";
import { existsSync } from "fs";
import { createHash } from "crypto";
import path from "path";
import process from "process";
import { readdir, stat, writeFile } from "fs/promises";

/**
 * 
 * @param {string} rootPath 
 * @param {string} testPath 
 */
export function rootedPath(rootPath, testPath) {
    if (path.relative(rootPath, testPath).startsWith("../")) {
        return {
            isRooted: false,
            safePath: rootPath
        };
    } else {
        return {
            isRooted: true,
            safePath: testPath
        }
    }
}

function get7ZExecutableName() {
    if (process.platform === "win32") {
        return ".\\extern\\7z.exe";
    }
    return "7z";
}

/**
 * @param {string} archiveName 
 * @param {string} outputDirectory 
 * @returns 
 */
export async function extractWith7Z(archiveName, outputDirectory) {
    if (existsSync(`${archiveName}.fin`)) {
        return;
    }

    const ret = spawn(get7ZExecutableName(), ['x', archiveName, `-o${outputDirectory}`, '-y']);
    await new Promise(resolve => {
        ret.on("exit", () => {
            resolve();
        });
    })
    await writeFile(`${archiveName}.fin`, "");
}

function getFFMPEGExecutableName() {
    if (process.platform === "win32") {
        return ".\\extern\\ffmpeg.exe";
    }
    return "ffmpeg";
}

export async function extractFirstFrameWithFFMPEG(inputFileName, outputFileName) {
    const ret = spawn(getFFMPEGExecutableName(), ['-y', '-i', inputFileName, "-vf", "scale=iw*sar:ih,setsar=1", '-vframes', '1', outputFileName]);
    return await new Promise(resolve => {
        ret.on("error", () => {
            resolve(false);
        });
        ret.on("exit", (code) => {
            if (code !== 0) {
                resolve(false);
            }
            resolve(true);
        })
    });
}

const SERIALIZATION_BUF = Buffer.allocUnsafe(4);
/**
 * @param {number} float
 */
export function serializeFloat(float) {
    SERIALIZATION_BUF.writeFloatLE(float);
    return SERIALIZATION_BUF.toString("binary");
}

/**
 * @param {Buffer} buffer 
 */
export function deserializeFloat(buffer) {
    return buffer.readFloatLE();
}

/**
 * 
 * @param {string} directory 
 * @param {{
 *     recursive?: boolean
 * }} options 
 */
export async function getAllFileEntries(directory, options) {
    options ??= {};
    options.recursive ??= false;

    /** @type {string[]} */
    const entries = [];

    for (const entry of await readdir(directory)) {
        const entryPath = path.join(directory, entry);
        const entryStat = await stat(entryPath);
        if (entryStat.isDirectory()) {
            if (options.recursive) {
                for (const fileEntry of await getAllFileEntries(entryPath, options)) {
                    entries.push(fileEntry);
                }
            }
        } else if (entryStat.isFile()) {
            entries.push(entryPath);
        }
    }

    return entries;
}

/**
 * @param {Buffer | string} input 
 * @returns 
 */
export function sha256(input) {
    return createHash('sha256').update(input).digest();
}