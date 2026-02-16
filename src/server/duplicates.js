import sharp from "sharp";
import { extractNthSecondWithFFMPEG, sha256, extractVideoMetadataWithFFProbe } from "../util.js";
import shuffle from "knuth-shuffle-seeded";
import path from "path";
import { getMergedGroups, mergeExistingGroupsIntoGroupMap, randomID } from "../client/js/client-util.js";
import { rm } from "fs/promises";
import { DATABASE_DIR, TMP_FOLDER } from "../db/db-util.js";
import { appendFileSync } from "fs";
import { HASH_ALGORITHMS } from "../perf-binding/perf-img.js";

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

//0dup/7sim 0.9977
export const CLOSE_HASH_WEIGHTS = {
    "LEFT": {
        "multiplier": 3.5,
        "powHundredths": 45
    },
    "LEFT_SQ": {
        "multiplier": 66.5,
        "powHundredths": 10
    },
    "LEFT_HEIGHT_RATIO": {
        "multiplier": 68,
        "powHundredths": 10
    },
    "LEFT_HEIGHT_RATIO_SQ": {
        "multiplier": 14.5,
        "powHundredths": 11
    },
    "TOP": {
        "multiplier": 1.5,
        "powHundredths": 70
    },
    "TOP_SQ": {
        "multiplier": 52.5,
        "powHundredths": 40
    },
    "TOP_WIDTH_RATIO": {
        "multiplier": 11,
        "powHundredths": 100
    },
    "TOP_WIDTH_RATIO_SQ": {
        "multiplier": 2,
        "powHundredths": 100
    },
    "LEFT_TOP_RATIO": {
        "multiplier": 5.5,
        "powHundredths": 55
    },
    "TOP_LEFT_RATIO": {
        "multiplier": 1.5,
        "powHundredths": 109
    },
    "WIDTH": {
        "multiplier": 9,
        "powHundredths": 100
    },
    "WIDTH_SQ": {
        "multiplier": 1,
        "powHundredths": 98
    },
    "HEIGHT": {
        "multiplier": 2,
        "powHundredths": 97
    },
    "HEIGHT_SQ": {
        "multiplier": 0.5,
        "powHundredths": 95
    },
    "WIDTH_HEIGHT_RATIO": {
        "multiplier": 0.5,
        "powHundredths": 128
    },
    "HEIGHT_WIDTH_RATIO": {
        "multiplier": 1,
        "powHundredths": 102
    },
    "COVERAGE": {
        "multiplier": 9,
        "powHundredths": 100
    },
    "COVERAGE_SQ": {
        "multiplier": 1,
        "powHundredths": 20
    },
    "X_AVG": {
        "multiplier": 2,
        "powHundredths": 3
    },
    "Y_AVG": {
        "multiplier": 1,
        "powHundredths": 116
    },
    "X_Y_AVG_RATIO": {
        "multiplier": 13.5,
        "powHundredths": 8
    },
    "Y_X_AVG_RATIO": {
        "multiplier": 2.5,
        "powHundredths": 27
    },
    "AMOUNT_IN_CIRCLE": {
        "multiplier": 3,
        "powHundredths": 23
    },
    "AMOUNT_IN_CIRCLE2": {
        "multiplier": 1,
        "powHundredths": 87
    },
    "AMOUNT_IN_SMALL_CIRCLE": {
        "multiplier": 9,
        "powHundredths": 18
    }
};
export const MISSING_ENTRY_WEIGHT = 4992;
const PERCENTAGE_SIZE = 1;
const MAX_SHAPE_COUNT = 3;

/**
 * @param {number} imagePath 
 * @param {number} rangeCount 
 * @param {number} stepPercentage 
 * @param {typeof CLOSE_HASH_WEIGHTS} weights
 */
export async function parametricCloseHash(imagePath, rangeCount, stepPercentage, weights) {
    const closeHashEntryLength = Object.values(weights).reduce((acc, weight) => acc + ((weight.multiplier !== 0 ? 1 : 0) * PERCENTAGE_SIZE), 0);
    sharp.cache(false);
    let sharpRead;
    try {
        sharpRead = await sharp(imagePath).raw().toBuffer({resolveWithObject: true});
    } catch (e) {
        const uniqueID = randomID(8);
        const extractedFileName = path.join(TMP_FOLDER, `${path.basename(imagePath)}-${uniqueID}.jpg`);
        const metadata = await extractVideoMetadataWithFFProbe(imagePath);
        if (metadata.frames === 1) {
            await extractNthSecondWithFFMPEG(imagePath, 0, extractedFileName);

            try {
                sharpRead = await sharp(extractedFileName).raw().toBuffer({resolveWithObject: true});
            } catch (e) {
                await rm(extractedFileName);
                console.log("RETURNED UNDEFINED");
                return undefined;
            }
            await rm(extractedFileName);
        } else {
            const maxDim = Math.max(metadata.width, metadata.height);
            const scale = Math.min(1, 2560 / maxDim);
            const scaledWidth = Math.floor(metadata.width * scale);
            const scaledHeight = Math.floor(metadata.height * scale);

            const relevantSeconds = [
                metadata.duration / 5,
                metadata.duration * 2 / 5,
                metadata.duration * 3 / 5,
                metadata.duration * 4 / 5,
            ];
            /** @type {string[]} */
            const extractedFileNames = [];
            for (let i = 0; i < relevantSeconds.length; ++i) {
                const extractedFileNameI = path.join(TMP_FOLDER, `${path.basename(imagePath)}-${uniqueID}-${i}.jpg`);
                extractedFileNames.push(extractedFileNameI);
                await extractNthSecondWithFFMPEG(imagePath, relevantSeconds[i], extractedFileNameI, {
                    width: scaledWidth,
                    height: scaledHeight
                });
            }

            sharpRead = await sharp({
                create: {
                    width: scaledWidth * 2,
                    height: scaledHeight * 2,
                    channels: 3,
                    background: {r: 0, g: 0, b: 0}
                }
            }).composite(extractedFileNames.map((fileName, i) => ({
                input: fileName,
                left: (i % 2) * scaledWidth,
                top: Math.floor(i / 2) * scaledHeight,
                width: scaledWidth,
                height: scaledHeight
            }))).raw().toBuffer({resolveWithObject: true});

            for (const extractedFileNameI of extractedFileNames) {
                await rm(extractedFileNameI);
            }
        }
    }
    const {data: imageBytes, info} = sharpRead;
    const CHANNEL_COUNT = info.channels;

    const rangeRsh = Math.floor(Math.log2(256 / rangeCount));
    rangeCount = 256 / (1 << rangeRsh);
    const stepX = Math.max(1, Math.ceil(info.width * stepPercentage));
    const stepY = Math.max(1, Math.ceil(info.height * stepPercentage));
    /**
     * @template T
     * @param {() => T} instance 
     */
    const createShapeRanges = (instance) => {
        const arr = [];
        for (let i = 0; i < rangeCount; ++i) {
            arr.push(instance());
        }
        return arr;
    }

    const colorToIndexToShapeMap = {
        r: createShapeRanges(() => new Map()),
        g: createShapeRanges(() => new Map()),
        b: createShapeRanges(() => new Map())
    };

    const currentShapeID = {current: 0};
    const processFloorPixel = (pixelPosition) => {
        const leftPixelPosition = pixelPosition - CHANNEL_COUNT * stepX;
        const upLeftPixelPosition = pixelPosition - ((info.width * stepY + stepX) * CHANNEL_COUNT);
        const upPixelPosition = pixelPosition - (info.width * stepY * CHANNEL_COUNT);
        const upRightPixelPosition = pixelPosition - ((info.width * stepY - stepX) * CHANNEL_COUNT);
        
        const rIndex = imageBytes[pixelPosition + 0] >> rangeRsh;
        const gIndex = imageBytes[pixelPosition + 1] >> rangeRsh;
        const bIndex = imageBytes[pixelPosition + 2] >> rangeRsh;

        mergeExistingGroupsIntoGroupMap(colorToIndexToShapeMap.r[rIndex], pixelPosition, [leftPixelPosition, upLeftPixelPosition, upPixelPosition, upRightPixelPosition], currentShapeID);
        mergeExistingGroupsIntoGroupMap(colorToIndexToShapeMap.g[gIndex], pixelPosition, [leftPixelPosition, upLeftPixelPosition, upPixelPosition, upRightPixelPosition], currentShapeID);
        mergeExistingGroupsIntoGroupMap(colorToIndexToShapeMap.b[bIndex], pixelPosition, [leftPixelPosition, upLeftPixelPosition, upPixelPosition, upRightPixelPosition], currentShapeID);
    }

    const processWallPixel = (pixelPosition) => {
        const upPixelPosition = pixelPosition - (info.width * stepY * CHANNEL_COUNT);
        const upLeftPixelPosition = pixelPosition - ((info.width * stepY + stepX)  * CHANNEL_COUNT);
        const leftPixelPosition = pixelPosition - stepX * CHANNEL_COUNT;
        const downLeftPixelPosition = pixelPosition + ((info.width * stepY - stepX) * CHANNEL_COUNT);

        const rIndex = imageBytes[pixelPosition + 0] >> rangeRsh;
        const gIndex = imageBytes[pixelPosition + 1] >> rangeRsh;
        const bIndex = imageBytes[pixelPosition + 2] >> rangeRsh;

        mergeExistingGroupsIntoGroupMap(colorToIndexToShapeMap.r[rIndex], pixelPosition, [upPixelPosition, upLeftPixelPosition, leftPixelPosition, downLeftPixelPosition], currentShapeID);
        mergeExistingGroupsIntoGroupMap(colorToIndexToShapeMap.g[gIndex], pixelPosition, [upPixelPosition, upLeftPixelPosition, leftPixelPosition, downLeftPixelPosition], currentShapeID);
        mergeExistingGroupsIntoGroupMap(colorToIndexToShapeMap.b[bIndex], pixelPosition, [upPixelPosition, upLeftPixelPosition, leftPixelPosition, downLeftPixelPosition], currentShapeID);
    }

    let d = 0;
    for (; d * stepX < info.width && d * stepY < info.height; ++d) {
        for (let dd = d; dd >= 0; --dd) {
            const x1 = (d - dd) * stepX;
            const y1 = d * stepY;
            const pixelPosition1 = CHANNEL_COUNT * (x1 + (y1 * info.width));
            processFloorPixel(pixelPosition1);

            if (dd === d) {
                continue;
            }

            const x2 = d * stepX;
            const y2 = (d - dd) * stepY;
            const pixelPosition2 = CHANNEL_COUNT * (x2 + (y2 * info.width));
            processWallPixel(pixelPosition2);
        }
    }

    if (info.width > info.height) {
        for (; d * stepX < info.width; ++d) {
            const x = d * stepX;
            for (let y = 0; y < info.height; y += stepY) {
                const pixelPosition = CHANNEL_COUNT * (x + (y * info.width));
                processWallPixel(pixelPosition);
            }
        }
    } else if (info.width < info.height) {
        for (; d * stepY < info.height; ++d) {
            const y = d * stepY;
            for (let x = 0; x < info.width; x += stepX) {
                const pixelPosition = CHANNEL_COUNT * (x + (y * info.width));
                processFloorPixel(pixelPosition);
            }
        }
    }

    const largestShapes = {
        r: createShapeRanges(() => []),
        g: createShapeRanges(() => []),
        b: createShapeRanges(() => []),
    };

    for (let color of ['r', 'g', 'b']) {
        for (let rangeIndex = 0; rangeIndex < rangeCount; ++rangeIndex) {
            /** @type {Map<number, {group: number}>} */
            const shapeMap = colorToIndexToShapeMap[color][rangeIndex];
            const shapes = getMergedGroups(shapeMap);
            for (const shape of shapes) {
                for (let i = MAX_SHAPE_COUNT - 1; i >= 0; --i) {
                    const comparisonShape = largestShapes[color][rangeIndex][i];

                    if (comparisonShape === undefined || comparisonShape.length < shape.length) {
                        largestShapes[color][rangeIndex][i + 1] = comparisonShape;
                        largestShapes[color][rangeIndex][i] = shape;
                    }
                }
                largestShapes[color][rangeIndex].splice(MAX_SHAPE_COUNT, 1);
            }
        }
    }

    const percentageToByte = (percentage) => {
        if (percentage === 1) {
            return 255;
        }

        return Math.floor(percentage * 256);
    }

    const percentageToBytes = (percentage, byteCount) => {
        const buf = Buffer.allocUnsafe(byteCount);
        for (let i = 0; i < byteCount; ++i) {
            const percentageAmountInByte = Math.min(1, Math.max(0, percentage * byteCount));
            percentage -= 1 / byteCount;
            buf.writeUint8(percentageToByte(percentageAmountInByte), i);
        }

        return buf;
    }

    let hash = Buffer.allocUnsafe(MAX_SHAPE_COUNT * 3 * rangeCount * (closeHashEntryLength + 1));
    let hashPos = 0;
    for (let color of ['r', 'g', 'b']) {
        for (let i = 0; i < rangeCount; ++i) {
            for (let j = 0; j < MAX_SHAPE_COUNT; ++j) {
                const shape = largestShapes[color][i][j];
                if (shape === undefined) {
                    hash.writeUint8(0, hashPos);
                    ++hashPos;
                    continue;
                }
                let leftMostPixel = info.width;
                let rightMostPixel = 0;
                let topMostPixel = info.height;
                let bottomMostPixel = 0;
                let xSum = 0;
                let ySum = 0;
                for (let i = 0; i < shape.length; ++i) {
                    let pixelPosition = shape[i];
                    pixelPosition /= CHANNEL_COUNT;
                    const pixelX = pixelPosition % info.width;
                    xSum += pixelX;
                    leftMostPixel = Math.min(leftMostPixel, pixelX);
                    rightMostPixel = Math.max(rightMostPixel, pixelX);
                    const pixelY = Math.floor(pixelPosition / info.width);
                    ySum += pixelY;
                    topMostPixel = Math.min(topMostPixel, pixelY);
                    bottomMostPixel = Math.max(bottomMostPixel, pixelY);
                }

                const width = rightMostPixel - leftMostPixel + stepX;
                const height = bottomMostPixel - topMostPixel + stepY;
                const xCenter = leftMostPixel + (width / 2)
                const yCenter = topMostPixel + (height / 2);
                const radius = Math.min(width, height) * 0.5;
                const smallRadius = 0.5 * radius;
                
                let pixelsInCircle = 0;
                let pixelsInSmallCircle = 0;
                for (let i = 0; i < shape.length; ++i) {
                    let pixelPosition = shape[i];
                    pixelPosition /= CHANNEL_COUNT;
                    const pixelX = pixelPosition % info.width;
                    const pixelY = Math.floor(pixelPosition / info.width);
                    const pixelDistanceFromCenterX = Math.abs(pixelX - xCenter);
                    const pixelDistanceFromCenterY = Math.abs(pixelY - yCenter);
                    const pixelDistanceFromCenter = Math.pow(pixelDistanceFromCenterX, 2) + Math.pow(pixelDistanceFromCenterY, 2);
                    if (pixelDistanceFromCenter < radius) {
                        ++pixelsInCircle;
                    }
                    if (pixelDistanceFromCenter < smallRadius) {
                        ++pixelsInSmallCircle;
                    }
                }
                const circleArea = Math.PI * Math.pow(radius, 2);
                const rectangleArea = width * height;
                const circleMultiplier = rectangleArea / circleArea;
                const smallCircleArea = Math.PI * Math.pow(smallRadius, 2);
                const smallCircleMultiplier = rectangleArea / smallCircleArea;

                const xAvg = xSum / shape.length;
                const yAvg = ySum / shape.length;
                const xAvgPercent = (xAvg - leftMostPixel) / Math.max(1, (width - stepX));
                const yAvgPercent = (yAvg - topMostPixel) / Math.max(1, (height - stepY));
                hash.writeUint8(closeHashEntryLength, hashPos);
                ++hashPos;
                if (weights.LEFT.multiplier !== 0) {
                    hash.set(percentageToBytes(leftMostPixel / info.width, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.LEFT_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(leftMostPixel / info.width, 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.LEFT_HEIGHT_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(leftMostPixel / info.height, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.LEFT_HEIGHT_RATIO_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(leftMostPixel / info.height, 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.TOP.multiplier !== 0) {
                    hash.set(percentageToBytes(topMostPixel / info.height, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.TOP_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(topMostPixel / info.height, 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.TOP_WIDTH_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(topMostPixel / info.width, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.TOP_WIDTH_RATIO_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(topMostPixel / info.width, 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.LEFT_TOP_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.max(1, leftMostPixel) / Math.max(1, topMostPixel), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.TOP_LEFT_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.max(1, topMostPixel) / Math.max(1, leftMostPixel), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.WIDTH.multiplier !== 0) {
                    hash.set(percentageToBytes(width / info.width, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.WIDTH_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(width / info.width, 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.HEIGHT.multiplier !== 0) {
                    hash.set(percentageToBytes(height / info.height, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.HEIGHT_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(height / info.height, 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.WIDTH_HEIGHT_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(width / height, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.HEIGHT_WIDTH_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(height / width, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.COVERAGE.multiplier !== 0) {
                    hash.set(percentageToBytes(shape.length / (width / stepX * height / stepY), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.COVERAGE_SQ.multiplier !== 0) {
                    hash.set(percentageToBytes(Math.pow(shape.length / (width / stepX * height / stepY), 2), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.X_AVG.multiplier !== 0) {
                    hash.set(percentageToBytes(xAvgPercent, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.Y_AVG.multiplier !== 0) {
                    hash.set(percentageToBytes(yAvgPercent, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.X_Y_AVG_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(xAvgPercent / Math.max(1e-7, yAvgPercent), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.Y_X_AVG_RATIO.multiplier !== 0) {
                    hash.set(percentageToBytes(yAvgPercent / Math.max(1e-7, xAvgPercent), PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.AMOUNT_IN_CIRCLE.multiplier !== 0) {
                    hash.set(percentageToBytes(circleMultiplier * pixelsInCircle / shape.length, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.AMOUNT_IN_CIRCLE2.multiplier !== 0) {
                    hash.set(percentageToBytes(32 * pixelsInCircle / shape.length, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
                if (weights.AMOUNT_IN_SMALL_CIRCLE.multiplier !== 0) {
                    hash.set(percentageToBytes(smallCircleMultiplier * pixelsInSmallCircle / shape.length, PERCENTAGE_SIZE), hashPos);
                    hashPos += PERCENTAGE_SIZE;
                }
            }
            
        }
    }
    
    if (hashPos < hash.length) {
        hash = hash.subarray(0, hashPos);
    }
    return hash;
}

const LOOKUP_BITS_SET_COUNT = (() => {
    const bitsSetCount = [];
    for (let i = 0; i < 256; ++i) {
        bitsSetCount.push(
            ((i &   1) ? 1 : 0)
          + ((i &   2) ? 1 : 0)
          + ((i &   4) ? 1 : 0)
          + ((i &   8) ? 1 : 0)
          + ((i &  16) ? 1 : 0)
          + ((i &  32) ? 1 : 0)
          + ((i &  64) ? 1 : 0)
          + ((i & 128) ? 1 : 0)
        );
    }
    return Buffer.from(bitsSetCount);
})();

/**
 * @param {Buffer} hash1 
 * @param {Buffer} hash2 
 */
export function hammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; ++i) {
        distance += LOOKUP_BITS_SET_COUNT[hash1[i] ^ hash2[i]];
    }
    return distance;
}


const CLOSE_HASH_WEIGHTS_FILTERED = Object.values(CLOSE_HASH_WEIGHTS).filter(weight => weight.multiplier !== 0);
/**
 * @param {Databases} dbs
 * @param {typeof CLOSE_HASH_WEIGHTS_FILTERED} weightArray
 * @param {number} missingEntryWeight
 * @param {number=} distanceCutoff
 */
export async function weightedCloseHashDistances(dbs, weightArray, missingEntryWeight, distanceCutoff) {
    distanceCutoff ??= 0xFFFFFFFF;
    const mulWeights = [];
    const powHundredthWeights = [];
    for (const weight of weightArray) {
       mulWeights.push(Math.round(weight.multiplier * 2));
       powHundredthWeights.push(weight.powHundredths);
    }

    const missingEntryWeightEdited = missingEntryWeight * 2;

    return (await dbs.perfImg.compareHashes(HASH_ALGORITHMS.MY_SHAPE_HASH, distanceCutoff, {
        missingEntryWeight: missingEntryWeightEdited,
        mulWeights,
        powHundredthWeights
    })).comparisonsMade;
}

/**
 * @param {Databases} dbs
 * @param {number=} distanceCutoff
 */
export function closeHashDistances(dbs, distanceCutoff) {
    return weightedCloseHashDistances(dbs, CLOSE_HASH_WEIGHTS_FILTERED, MISSING_ENTRY_WEIGHT, distanceCutoff);
}

export async function closeHash(imagePath) {
    return await parametricCloseHash(imagePath, 16, 1/100, CLOSE_HASH_WEIGHTS);
}