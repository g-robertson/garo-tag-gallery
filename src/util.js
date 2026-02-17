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
        return {
            success: true
        };
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
 * @param {string=} ffprobeExecutable
 * @returns {Promise<{
 *   frames: number
 *   duration: number
 *   width: number
 *   height: number
 *   videoSize: number
 * }>}
 **/
export async function extractVideoMetadataWithFFProbe(inputFileName, ffprobeExecutable) {
    const NULL_RETURN = {
        frames: 0,
        duration: undefined,
        width: undefined,
        height: undefined,
        videoSize: 0
    };

    const videoDataFFProbe = spawn(ffprobeExecutable ?? getFFPROBEExecutableName(), [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-count_packets",
        "-show_entries",
        "format=duration:stream=nb_read_packets,width,height:packet=size",
        "-of",
        "json=c=1",
        inputFileName
    ]);
    let metadata = "";
    videoDataFFProbe.stdout.on("data", (chunk) => {
        metadata += chunk.toString();
    });

    const videoData = await new Promise(resolve => {
        videoDataFFProbe.on("error", (e) => {
            console.log(e);
            resolve(NULL_RETURN);
        });

        videoDataFFProbe.on("exit", (code) => {
            if (code !== 0) {
                resolve(NULL_RETURN);
                return;
            }

            const parsedMetadata = JSON.parse(metadata);
            const format = parsedMetadata.format ?? {};
            const stream = parsedMetadata.streams[0] ?? {};
            const packets = parsedMetadata.packets ?? [];
            const frames = Number(stream.nb_read_packets ?? 0);
            resolve({
                duration: (frames <= 1 || format.duration === undefined) ? undefined : Number(format.duration),
                frames,
                width: stream.width === undefined ? undefined : Number(stream.width),
                height: stream.height === undefined ? undefined : Number(stream.height),
                videoSize: packets.reduce((acc, cur) => acc + Number(cur.size ?? 0), 0)
            });
        })
    });

    videoDataFFProbe.kill();
    return videoData;
}

/**
 * @param {string} inputFileName 
 * @param {string=} ffprobeExecutable
 * @returns {Promise<{
 *   duration: number
 *   sampleRate: number
 *   channelCount: number
 *   audioSize: number
 * }>}
 **/
export async function extractAudioMetadataWithFFProbe(inputFileName, ffprobeExecutable) {
    const NULL_RETURN = {
        duration: undefined,
        sampleRate: undefined,
        channelCount: undefined,
        audioSize: 0
    };

    const audioDataFFProbe = spawn(ffprobeExecutable ?? getFFPROBEExecutableName(), [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "format=duration:stream=sample_rate,channels:packet=size",
        "-of",
        "json=c=1",
        inputFileName
    ]);
    let metadata = "";
    audioDataFFProbe.stdout.on("data", (chunk) => {
        metadata += chunk.toString();
    });

    const audioData = await new Promise(resolve => {
        audioDataFFProbe.on("error", (e) => {
            console.log(e);
            resolve(NULL_RETURN);
        });

        audioDataFFProbe.on("exit", (code) => {
            if (code !== 0) {
                resolve(NULL_RETURN);
                return;
            }

            const parsedMetadata = JSON.parse(metadata);
            const format = parsedMetadata.format ?? {};
            const streamExists = parsedMetadata.streams[0] !== undefined;
            const stream = parsedMetadata.streams[0] ?? {};
            const packets = parsedMetadata.packets ?? [];
            resolve({
                duration: (!streamExists || format.duration === undefined) ? undefined : Number(format.duration),
                sampleRate: stream.sample_rate === undefined ? undefined : Number(stream.sample_rate),
                channelCount: stream.channels === undefined ? undefined : Number(stream.channels),
                audioSize: packets.reduce((acc, cur) => acc + Number(cur.size ?? 0), 0)
            });
        })
    });

    audioDataFFProbe.kill();
    return audioData;
}

/**
 * @param {string} inputFileName 
 * @param {string=} ffprobeExecutable
 */
export async function extractMetadataWithFFProbe(inputFileName, ffprobeExecutable) {
    const videoData = await extractVideoMetadataWithFFProbe(inputFileName, ffprobeExecutable);
    const audioData = await extractAudioMetadataWithFFProbe(inputFileName, ffprobeExecutable);
    return {
        ...videoData,
        ...audioData,
        duration: videoData.duration ?? audioData.duration
    };
}

const FLOAT_SERIALIZATION_BUF = Buffer.allocUnsafe(4);
/**
 * @param {number} float
 */
export function serializeFloat(float) {
    FLOAT_SERIALIZATION_BUF.writeFloatLE(float);
    return FLOAT_SERIALIZATION_BUF.toString("binary");
}

/**
 * @param {Buffer} buffer 
 */
export function deserializeFloat(buffer) {
    return buffer.readFloatLE();
}

const DOUBLE_SERIALIZATION_BUF = Buffer.allocUnsafe(8);
/**
 * @param {number} float
 */
export function serializeDouble(float) {
    DOUBLE_SERIALIZATION_BUF.writeDoubleLE(float);
    return DOUBLE_SERIALIZATION_BUF.toString("binary");
}

/**
 * @param {Buffer} buffer 
 */
export function deserializeDouble(buffer) {
    return buffer.readDoubleLE();
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