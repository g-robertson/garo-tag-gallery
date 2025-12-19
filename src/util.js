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
            safePath: path.resolve(rootPath)
        };
    } else {
        return {
            isRooted: true,
            safePath: path.resolve(testPath)
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
    /**
     * @type {{
     *     success: boolean
     *     error?: string
     *     errorKnown?: boolean
     * }}
     **/
    const result = await new Promise(resolve => {
        ret.stderr.on("data", (err) => {
            const errorStr = err.toString();
            if (errorStr.includes("Unexpected end of archive")) {
                resolve({
                    success: false,
                    error: "Unexpected end of archive",
                    errorKnown: true
                });
            } else {
                resolve({
                    success: false,
                    error: errorStr,
                    errorKnown: false
                });
            }
        });
        ret.on("exit", () => {
            resolve({
                success: true
            });
        });
    });
    if (result.success) {
        await writeFile(`${archiveName}.fin`, "");
    }

    return result;
}

function getFFMPEGExecutableName() {
    if (process.platform === "win32") {
        return ".\\extern\\ffmpeg.exe";
    }
    return "ffmpeg";
}

function getFFPROBEExecutableName() {
    if (process.platform === "win32") {
        return ".\\extern\\ffprobe.exe";
    }
    return "ffprobe";
}

/**
 * @param {string} inputFileName 
 * @param {number} seconds 
 * @param {string} outputFileName
 * @param {{width: number, height: number}} dimensions
 * @param {string=} ffmpegExecutable 
 */
export async function extractNthSecondWithFFMPEG(inputFileName, seconds, outputFileName, dimensions, ffmpegExecutable) {
    let scale = "scale=iw*sar:ih,setsar=1";
    if (dimensions !== undefined) {
        scale = `scale=${dimensions.width}:${dimensions.height}`;
    }

    let ret;
    if (seconds === 0) {
        ret = spawn(ffmpegExecutable ?? getFFMPEGExecutableName(), ['-y', '-i', inputFileName, "-vf", scale, '-vframes', '1', outputFileName]);
    } else {
        const threeSecondPrior = seconds - 3;
        if (threeSecondPrior > 0) {
            ret = spawn(ffmpegExecutable ?? getFFMPEGExecutableName(), [
                '-y',
                "-ss",
                threeSecondPrior.toFixed(6),
                '-i',
                inputFileName,
                "-ss",
                "3",
                "-vf",
                scale,
                '-vframes',
                '1',
                outputFileName
            ]);

        } else {
            ret = spawn(ffmpegExecutable ?? getFFMPEGExecutableName(), [
                '-y',
                '-i',
                inputFileName,
                "-ss",
                seconds.toFixed(6),
                "-vf",
                scale,
                '-vframes',
                '1',
                outputFileName
            ]);
        }
    }
    return await new Promise(resolve => {
        ret.on("error", (e) => {
            console.log(e);
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

/**
 * @param {string} inputFileName 
 * @param {string} ffprobeExecutable
 * @returns {Promise<{
 *   frames: number
 *   duration: number
 *   width: number
 *   height: number
 * }>}
 */
export async function extractMetadataWithFFPROBE(inputFileName, ffprobeExecutable) {
    const ret = spawn(ffprobeExecutable ?? getFFPROBEExecutableName(), [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-count_packets",
        "-show_entries",
        "format=duration:stream=nb_read_packets,width,height",
        "-of",
        "json=c=1",
        inputFileName
    ]);
    let metadata = "";
    ret.stdout.on("data", (chunk) => {
        metadata += chunk.toString();
    });

    return await new Promise(resolve => {
        ret.on("error", (e) => {
            console.log(e);
            resolve(undefined);
        });

        ret.on("exit", (code) => {
            if (code !== 0) {
                resolve(undefined);
            }

            const parsedMetadata = JSON.parse(metadata);
            resolve({
                duration: Number(parsedMetadata.format.duration),
                frames: Number(parsedMetadata.streams[0].nb_read_packets),
                width: parsedMetadata.streams[0].width,
                height: parsedMetadata.streams[0].height,
            });
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