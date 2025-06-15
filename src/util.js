import { spawnSync } from "child_process";
import { existsSync, readdirSync, statSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import path from "path";
import process from "process";

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

export function extractWith7Z(archiveName, outputDirectory) {
    if (existsSync(`${archiveName}.fin`)) {
        return;
    }

    spawnSync(get7ZExecutableName(), ['x', archiveName, `-o${outputDirectory}`]).stdout.toString();
    writeFileSync(`${archiveName}.fin`, "");
}

function getFFMPEGExecutableName() {
    if (process.platform === "win32") {
        return ".\\extern\\ffmpeg.exe";
    }
    return "ffmpeg";
}

export async function extractFirstFrameWithFFMPEG(inputFileName, outputFileName) {
    const ret = spawnSync(getFFMPEGExecutableName(), ['-i', inputFileName, "-vf", "scale=iw*sar:ih,setsar=1", '-vframes', '1', outputFileName]);
    if (ret.error || ret.status !== 0) {
        return false;
    }
    return true;
}

/**
 * 
 * @param {string} directory 
 * @param {{recursive: boolean}} options 
 */
export function getAllFileEntries(directory, options) {
    options ??= {};
    options.recursive ??= false;

    /** @type {string[]} */
    const entries = [];

    for (const entry of readdirSync(directory)) {
        const entryPath = path.join(directory, entry);
        const entryStat = statSync(entryPath);
        if (entryStat.isDirectory()) {
            if (options.recursive) {
                for (const fileEntry of getAllFileEntries(entryPath, options)) {
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