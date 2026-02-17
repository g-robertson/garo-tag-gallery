import sharp from "sharp";
import { extractNthSecondWithFFMPEG, sha256, extractVideoMetadataWithFFProbe } from "../util.js";
import shuffle from "knuth-shuffle-seeded";
import path from "path";
import { randomID } from "../client/js/client-util.js";
import { rm } from "fs/promises";
import { TMP_FOLDER } from "../db/db-util.js";

/** @import {Databases} from "../db/db-util.js" */

/**
 * @param {string} imagePath 
 */
export async function exactDuplicateHash(imagePath) {
    const img = sharp(imagePath);
    const metadata = await img.metadata();
    if (metadata.pages !== undefined && metadata.pages !== 1) {
        return null;
    }

    return sha256(img.raw().ensureAlpha().toBuffer());
}

class DepthedRandomImagePoses {
    /** @type {Map<number, {xFrom: number, yFrom: number, xTo: number, yTo: number}[]}*/
    #cached = new Map();
    getDepth(depth) {
        if (this.#cached.get(depth) === undefined) {
            /** @type {{x: number, y: number}[]} */
            const randomImagePoses = [];
            const subdivisionLength = depth + 1;
            for (let x = 0; x < subdivisionLength; ++x) {
                for (let y = 0; y < subdivisionLength; ++y) {
                    randomImagePoses.push({
                        xFrom: x / subdivisionLength,
                        yFrom: y / subdivisionLength,
                        xTo: (x + 1) / subdivisionLength,
                        yTo: (y + 1) / subdivisionLength
                    });
                }
            }
            this.#cached.set(depth, shuffle(randomImagePoses, 1453442088));
        }

        return this.#cached.get(depth);
    }
};

const DEPTHED_RANDOM_IMAGE_POSES = new DepthedRandomImagePoses();
const RANDOM_IMAGE_SUBSAMPLES = (() => {
    const SUBDIVISION_LENGTH = 64;
    /** @type {{x: number, y: number}[]} */
    const randomImageSubsamples = [];
    for (let x = 0; x < SUBDIVISION_LENGTH; ++x) {
        for (let y = 0; y < SUBDIVISION_LENGTH; ++y) {
            randomImageSubsamples.push({x: x / SUBDIVISION_LENGTH, y: y / SUBDIVISION_LENGTH});
        }
    }
    return shuffle(randomImageSubsamples, 906120368);
})();

/**
 * 
 * @param {string} imagePath
 * @param {number} squaresDepth Image will be subdivided into (squaresDepth+1)^2 squares 
 * @param {number} squaresUsed The image will be sampled on squaresUsed of those squares
 * @param {number} subsampleDepth Each square will be subsampled subsampleDepth times
 * @param {boolean} visualize Whether or not to create an image representative of what closeHash saw
 */
async function blurHash_(imagePath, squaresDepth, squaresUsed, subsampleDepth, visualize) {
    visualize ??= false;

    const RANDOM_IMAGE_POSES = DEPTHED_RANDOM_IMAGE_POSES.getDepth(squaresDepth);
    if (squaresUsed > RANDOM_IMAGE_POSES.length) {
        throw "squaresUsed was larger than RANDOM_IMAGE_POSES.length";
    }
    if (subsampleDepth > RANDOM_IMAGE_SUBSAMPLES.length) {
        throw "subsampleDepth was larger than RANDOM_IMAGE_SUBSAMPLES.length";
    }

    let sharpInfo;
    try {
        sharpInfo = await sharp(imagePath).ensureAlpha(1).raw().toBuffer({resolveWithObject: true});
    } catch (e) {
        const uniqueID = randomID(8);
        const extractedFileName = path.join(TMP_FOLDER, `${path.basename(imagePath)}-${uniqueID}.png`);
        const metadata = await extractVideoMetadataWithFFProbe(imagePath);
        if (metadata.frames === 1) {
            await extractNthSecondWithFFMPEG(imagePath, 0, extractedFileName);
        } else {
            throw "Cannot extract movie with blurHash";
        }
        try {
            sharpInfo = await sharp(extractedFileName).ensureAlpha(1).raw().toBuffer({resolveWithObject: true});
        } catch (e) {
            await rm(extractedFileName);
            return undefined;
        }
        await rm(extractedFileName);
    }

    const {data: imageBytes, info} = sharpInfo;

    let composites = [];

    const buf = Buffer.alloc(squaresUsed * 3);
    for (let i = 0; i < squaresUsed; ++i) {
        const square = RANDOM_IMAGE_POSES[i];
        const squareLeft = Math.floor(square.xFrom * info.width);
        const squareTop = Math.floor(square.yFrom * info.height);
        const squareWidth = Math.floor(square.xTo * info.width - squareLeft);
        const squareHeight = Math.floor(square.yTo * info.height - squareTop);
        /** @type {{r: number, g: number, b: number}[]} */
        const subsampleColorAverage = {r: 0, g: 0, b: 0};
        for (let j = 0; j < subsampleDepth; ++j) {
            const subsamplePixelPosition = {
                x: squareLeft + Math.floor(RANDOM_IMAGE_SUBSAMPLES[j].x * squareWidth),
                y: squareTop + Math.floor(RANDOM_IMAGE_SUBSAMPLES[j].y * squareHeight),
            };

            const subsamplePixelIndex = 4 * ((subsamplePixelPosition.y * info.width) + subsamplePixelPosition.x);
            
            subsampleColorAverage.r += imageBytes[subsamplePixelIndex];
            subsampleColorAverage.g += imageBytes[subsamplePixelIndex + 1];
            subsampleColorAverage.b += imageBytes[subsamplePixelIndex + 2];
        }

        buf[i] = Math.round(subsampleColorAverage.r / subsampleDepth);
        buf[i] = Math.round(subsampleColorAverage.g / subsampleDepth);
        buf[i] = Math.round(subsampleColorAverage.b / subsampleDepth);

        if (visualize) {
            composites.push({
                left: squareLeft,
                top: squareTop,
                input: {
                    create: {
                        background: {
                            r: Math.round(subsampleColorAverage.r / subsampleDepth),
                            g: Math.round(subsampleColorAverage.g / subsampleDepth),
                            b: Math.round(subsampleColorAverage.b / subsampleDepth),
                            alpha: 1
                        },
                        channels: 4,
                        width: squareWidth,
                        height: squareHeight
                    }
                }
            })
        }
    }

    if (visualize) {
        const img = sharp({
            create: {
                width: info.width,
                height: info.height,
                channels: 4,
                background: {r:255, g:0, b: 255, alpha: 0.5}
            }
        });
        await img.composite(composites).png().toFile(`${imagePath}.closehash.png`);
    }

    return buf;
}

export async function blurHash(imagePath) {
    return await blurHash_(imagePath, 15, 256, 10, false);
}