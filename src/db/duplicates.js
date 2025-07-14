import sharp from "sharp";
import { extractFirstFrameWithFFMPEG, sha256 } from "../util.js";
import shuffle from "knuth-shuffle-seeded";
import path from "path";
import { randomID } from "../client/js/client-util.js";
import { rm } from "fs/promises";
import { TMP_FOLDER } from "./db-util.js";

export async function exactDuplicateHash(imagePath) {
    return sha256(await sharp(imagePath).raw().ensureAlpha().toBuffer());
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
        await extractFirstFrameWithFFMPEG(imagePath, extractedFileName);
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

export async function closeHash_(imagePath, rangeCount, stepPercentage) {
    let sharpRead;
    try {
        sharpRead = await sharp(imagePath).raw().toBuffer({resolveWithObject: true});
    } catch (e) {
        const uniqueID = randomID(8);
        const extractedFileName = path.join(TMP_FOLDER, `${path.basename(imagePath)}-${uniqueID}.png`);
        await extractFirstFrameWithFFMPEG(imagePath, extractedFileName);
        try {
            sharpRead = await sharp(extractedFileName).raw().toBuffer({resolveWithObject: true});
        } catch (e) {
            await rm(extractedFileName);
            console.log("RETURNED UNDEFINED");
            return undefined;
        }
        await rm(extractedFileName);
    }
    const {data: imageBytes, info} = sharpRead;
    const CHANNEL_COUNT = info.channels;

    const rangeRsh = Math.floor(Math.log2(256 / rangeCount));
    rangeCount = 256 / (1 << rangeRsh);
    const stepX = Math.max(1, Math.ceil(info.width * stepPercentage));
    const stepY = Math.max(1, Math.ceil(info.height * stepPercentage));
    const createShapeRanges = (instance) => {
        const arr = [];
        for (let i = 0; i < rangeCount; ++i) {
            arr.push(instance());
        }
        return arr;
    }

    let currentShapeID = 0;
    const createShape = (color, index) => {
        ++currentShapeID;
        return {
            id: currentShapeID,
            pixels: [],
            color,
            index
        }
    }

    /** @type {Map<number, ReturnType<typeof createShape>>} */
    const shapes = new Map();

    const colorToIndexToShapeMap = {
        r: createShapeRanges(() => new Map()),
        g: createShapeRanges(() => new Map()),
        b: createShapeRanges(() => new Map())
    };

    const mergeShapes = (destShape, sourceShape) => {
        if (destShape === undefined) {
            return sourceShape;
        }
        if (sourceShape === undefined) {
            return destShape;
        }
        if (destShape.id === sourceShape.id) {
            return destShape;
        }

        if (destShape.pixels.length < sourceShape.pixels.length) {
            return mergeShapes(sourceShape, destShape);
        }

        shapes.delete(sourceShape.id);
        for (const pixel of sourceShape.pixels) {
            destShape.pixels.push(pixel);
        }
        sourceShape.id = destShape.id;
        sourceShape.pixels = destShape.pixels;
        return destShape;
    }

    const processFloorPixel = (pixelPosition) => {
        const leftPixelPosition = pixelPosition - CHANNEL_COUNT * stepX;
        const upLeftPixelPosition = pixelPosition - ((info.width * stepY + stepX) * CHANNEL_COUNT);
        const upPixelPosition = pixelPosition - (info.width * stepY * CHANNEL_COUNT);
        const upRightPixelPosition = pixelPosition - ((info.width * stepY - stepX) * CHANNEL_COUNT);
        
        const rIndex = imageBytes[pixelPosition + 0] >> rangeRsh;
        const gIndex = imageBytes[pixelPosition + 1] >> rangeRsh;
        const bIndex = imageBytes[pixelPosition + 2] >> rangeRsh;

        let rNeighborShape = colorToIndexToShapeMap.r[rIndex].get(leftPixelPosition);
        rNeighborShape = mergeShapes(rNeighborShape, colorToIndexToShapeMap.r[rIndex].get(upLeftPixelPosition));
        rNeighborShape = mergeShapes(rNeighborShape, colorToIndexToShapeMap.r[rIndex].get(upPixelPosition));
        rNeighborShape = mergeShapes(rNeighborShape, colorToIndexToShapeMap.r[rIndex].get(upRightPixelPosition));
        rNeighborShape ??= createShape("r", rIndex);
        rNeighborShape.pixels.push(pixelPosition);
        colorToIndexToShapeMap.r[rIndex].set(pixelPosition, rNeighborShape);
        shapes.set(rNeighborShape.id, rNeighborShape);

        let gNeighborShape = colorToIndexToShapeMap.g[gIndex].get(leftPixelPosition);
        gNeighborShape = mergeShapes(gNeighborShape, colorToIndexToShapeMap.g[gIndex].get(upLeftPixelPosition));
        gNeighborShape = mergeShapes(gNeighborShape, colorToIndexToShapeMap.g[gIndex].get(upPixelPosition));
        gNeighborShape = mergeShapes(gNeighborShape, colorToIndexToShapeMap.g[gIndex].get(upRightPixelPosition));
        gNeighborShape ??= createShape("g", gIndex);
        gNeighborShape.pixels.push(pixelPosition);
        colorToIndexToShapeMap.g[gIndex].set(pixelPosition, gNeighborShape);
        shapes.set(gNeighborShape.id, gNeighborShape);

        let bNeighborShape = colorToIndexToShapeMap.b[bIndex].get(leftPixelPosition);
        bNeighborShape = mergeShapes(bNeighborShape, colorToIndexToShapeMap.b[bIndex].get(upLeftPixelPosition));
        bNeighborShape = mergeShapes(bNeighborShape, colorToIndexToShapeMap.b[bIndex].get(upPixelPosition));
        bNeighborShape = mergeShapes(bNeighborShape, colorToIndexToShapeMap.b[bIndex].get(upRightPixelPosition));
        bNeighborShape ??= createShape("b", bIndex);
        bNeighborShape.pixels.push(pixelPosition);
        colorToIndexToShapeMap.b[bIndex].set(pixelPosition, bNeighborShape);
        shapes.set(bNeighborShape.id, bNeighborShape);
    }

    const processWallPixel = (pixelPosition) => {
        const upPixelPosition = pixelPosition - (info.width * stepY * CHANNEL_COUNT);
        const upLeftPixelPosition = pixelPosition - ((info.width * stepY + stepX)  * CHANNEL_COUNT) ;
        const leftPixelPosition = pixelPosition - stepX * CHANNEL_COUNT;
        const downLeftPixelPosition = pixelPosition + ((info.width * stepY - stepX) * CHANNEL_COUNT);

        const rIndex = imageBytes[pixelPosition + 0] >> rangeRsh;
        const gIndex = imageBytes[pixelPosition + 1] >> rangeRsh;
        const bIndex = imageBytes[pixelPosition + 2] >> rangeRsh;

        let rNeighborShape = colorToIndexToShapeMap.r[rIndex].get(upPixelPosition);
        rNeighborShape = mergeShapes(rNeighborShape, colorToIndexToShapeMap.r[rIndex].get(upLeftPixelPosition));
        rNeighborShape = mergeShapes(rNeighborShape, colorToIndexToShapeMap.r[rIndex].get(leftPixelPosition));
        rNeighborShape = mergeShapes(rNeighborShape, colorToIndexToShapeMap.r[rIndex].get(downLeftPixelPosition));
        rNeighborShape ??= createShape("r", rIndex);
        rNeighborShape.pixels.push(pixelPosition);
        colorToIndexToShapeMap.r[rIndex].set(pixelPosition, rNeighborShape);
        shapes.set(rNeighborShape.id, rNeighborShape);
        
        let gNeighborShape = colorToIndexToShapeMap.g[gIndex].get(upPixelPosition);
        gNeighborShape = mergeShapes(gNeighborShape, colorToIndexToShapeMap.g[gIndex].get(upLeftPixelPosition));
        gNeighborShape = mergeShapes(gNeighborShape, colorToIndexToShapeMap.g[gIndex].get(leftPixelPosition));
        gNeighborShape = mergeShapes(gNeighborShape, colorToIndexToShapeMap.g[gIndex].get(downLeftPixelPosition));
        gNeighborShape ??= createShape("g", gIndex);
        gNeighborShape.pixels.push(pixelPosition);
        colorToIndexToShapeMap.g[gIndex].set(pixelPosition, gNeighborShape);
        shapes.set(gNeighborShape.id, gNeighborShape);
        
        let bNeighborShape = colorToIndexToShapeMap.b[bIndex].get(upPixelPosition);
        bNeighborShape = mergeShapes(bNeighborShape, colorToIndexToShapeMap.b[bIndex].get(upLeftPixelPosition));
        bNeighborShape = mergeShapes(bNeighborShape, colorToIndexToShapeMap.b[bIndex].get(leftPixelPosition));
        bNeighborShape = mergeShapes(bNeighborShape, colorToIndexToShapeMap.b[bIndex].get(downLeftPixelPosition));
        bNeighborShape ??= createShape("b", bIndex);
        bNeighborShape.pixels.push(pixelPosition);
        colorToIndexToShapeMap.b[bIndex].set(pixelPosition, bNeighborShape);
        shapes.set(bNeighborShape.id, bNeighborShape);
    }

    for (let d = 0; d * stepX < info.width && d * stepY < info.height; ++d) {
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
        for (let x = info.height; x < info.width; x += stepX) {
            for (let y = 0; y < info.height; y += stepY) {
                const pixelPosition = CHANNEL_COUNT * (x + (y * info.width));
                processWallPixel(pixelPosition);
            }
        }
    } else if (info.width < info.height) {
        for (let y = info.width; y < info.height; y += stepY) {
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
    const MAX_SHAPE_COUNT = 3;
    for (const shape of shapes.values()) {
        for (let i = MAX_SHAPE_COUNT - 1; i >= 0; --i) {
            const comparisonShape = largestShapes[shape.color][shape.index][i];

            if (comparisonShape === undefined || comparisonShape.pixels.length < shape.pixels.length) {
                largestShapes[shape.color][shape.index][i + 1] = comparisonShape;
                largestShapes[shape.color][shape.index][i] = shape;
            }
        }
        largestShapes[shape.color][shape.index].splice(MAX_SHAPE_COUNT, 1);
    }

    const PERCENTAGE_TO_BYTES = [
        0b00000000,
        0b00000001,
        0b00000011,
        0b00000111,
        0b00001111,
        0b00011111,
        0b00111111,
        0b01111111,
        0b11111111,
    ];
    const percentageToByte = (percentage) => {
        if (percentage === 1) {
            return 0b11111111;
        }

        return PERCENTAGE_TO_BYTES[Math.floor(percentage * 9)];
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

    /**
     * @param {Buffer} bytes 
     * @param {number} weight 
     */
    const weightBytes = (bytes, weight) => {
        const buf = Buffer.allocUnsafe(bytes.length * weight);
        for (let i = 0; i < weight; ++i) {
            buf.set(bytes, i * bytes.length);
        }
        return buf;
    }

    const WEIGHTS = {
        LEFT: 1,
        TOP: 5,
        LEFT_TOP_RATIO: 0,
        TOP_LEFT_RATIO: 1,
        WIDTH: 2,
        HEIGHT: 1,
        WIDTH_HEIGHT_RATIO: 0,
        HEIGHT_WIDTH_RATIO: 1,
        COVERAGE: 6,
        X_AVG: 0,
        Y_AVG: 3,
        X_Y_AVG_RATIO: 0,
        Y_X_AVG_RATIO: 0,
        AMOUNT_IN_CIRCLE: 0,
        AMOUNT_IN_SMALL_CIRCLE: 1
    };
    const PERCENTAGE_SIZE = 1;

    const HASH_ENTRY_LENGTH = Object.values(WEIGHTS).reduce((acc, weight) => acc + (weight * PERCENTAGE_SIZE), 0);

    let hash = Buffer.allocUnsafe(MAX_SHAPE_COUNT * 3 * rangeCount * (HASH_ENTRY_LENGTH + 1));
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
                for (let i = 0; i < shape.pixels.length; ++i) {
                    let pixelPosition = shape.pixels[i];
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
                const radius = Math.min(width, height);
                const smallRadius = 0.5 * radius;
                
                let pixelsInCircle = 0;
                let pixelsInSmallCircle = 0;
                for (let i = 0; i < shape.pixels.length; ++i) {
                    let pixelPosition = shape.pixels[i];
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

                const xAvg = xSum / shape.pixels.length;
                const yAvg = ySum / shape.pixels.length;
                const xAvgPercent = (xAvg - leftMostPixel) / Math.max(1, (width - stepX));
                const yAvgPercent = (yAvg - topMostPixel) / Math.max(1, (height - stepY));
                hash.writeUint8(HASH_ENTRY_LENGTH, hashPos);
                ++hashPos;
                hash.set(weightBytes(percentageToBytes(leftMostPixel / info.width, PERCENTAGE_SIZE), WEIGHTS.LEFT), hashPos);
                hashPos += WEIGHTS.LEFT * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(topMostPixel / info.width, PERCENTAGE_SIZE), WEIGHTS.TOP), hashPos);
                hashPos += WEIGHTS.TOP * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(Math.max(1, leftMostPixel) / Math.max(1, topMostPixel), PERCENTAGE_SIZE), WEIGHTS.LEFT_TOP_RATIO), hashPos);
                hashPos += WEIGHTS.LEFT_TOP_RATIO * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(Math.max(1, topMostPixel) / Math.max(1, leftMostPixel), PERCENTAGE_SIZE), WEIGHTS.TOP_LEFT_RATIO), hashPos);
                hashPos += WEIGHTS.TOP_LEFT_RATIO * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(width / info.width, PERCENTAGE_SIZE), WEIGHTS.WIDTH), hashPos);
                hashPos += WEIGHTS.WIDTH * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(height / info.height, PERCENTAGE_SIZE), WEIGHTS.HEIGHT), hashPos);
                hashPos += WEIGHTS.HEIGHT * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(width / height, PERCENTAGE_SIZE), WEIGHTS.WIDTH_HEIGHT_RATIO), hashPos);
                hashPos += WEIGHTS.WIDTH_HEIGHT_RATIO * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(height / width, PERCENTAGE_SIZE), WEIGHTS.HEIGHT_WIDTH_RATIO), hashPos);
                hashPos += WEIGHTS.HEIGHT_WIDTH_RATIO * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(shape.pixels.length / (width / stepX * height / stepY), PERCENTAGE_SIZE), WEIGHTS.COVERAGE), hashPos);
                hashPos += WEIGHTS.COVERAGE * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(xAvgPercent, PERCENTAGE_SIZE), WEIGHTS.X_AVG), hashPos);
                hashPos += WEIGHTS.X_AVG * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(yAvgPercent, PERCENTAGE_SIZE), WEIGHTS.Y_AVG), hashPos);
                hashPos += WEIGHTS.Y_AVG * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(xAvgPercent / Math.max(1e-7, yAvgPercent), PERCENTAGE_SIZE), WEIGHTS.X_Y_AVG_RATIO), hashPos);
                hashPos += WEIGHTS.X_Y_AVG_RATIO * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(yAvgPercent / Math.max(1e-7, xAvgPercent), PERCENTAGE_SIZE), WEIGHTS.Y_X_AVG_RATIO), hashPos);
                hashPos += WEIGHTS.Y_X_AVG_RATIO * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(8 * pixelsInCircle / shape.pixels.length, PERCENTAGE_SIZE), WEIGHTS.AMOUNT_IN_CIRCLE), hashPos);
                hashPos += WEIGHTS.AMOUNT_IN_CIRCLE * PERCENTAGE_SIZE;
                hash.set(weightBytes(percentageToBytes(32 * pixelsInSmallCircle / shape.pixels.length, PERCENTAGE_SIZE), WEIGHTS.AMOUNT_IN_SMALL_CIRCLE), hashPos);
                hashPos += WEIGHTS.AMOUNT_IN_SMALL_CIRCLE * PERCENTAGE_SIZE;
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
    return bitsSetCount;
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

/**
 * @param {Buffer} hash1 
 * @param {Buffer} hash2 
 */
export function closeHashDistance(hash1, hash2) {
    let distance = 0;
    let hash1Pos = 0;
    let hash2Pos = 0;
    while (hash1Pos !== hash1.length && hash2Pos !== hash2.length) {
        const hash1EntryLength = hash1[hash1Pos];
        ++hash1Pos;
        const hash2EntryLength = hash2[hash2Pos];
        ++hash2Pos;
        if (hash1EntryLength === hash2EntryLength) {
            distance += hammingDistance(hash1.subarray(hash1Pos, hash1Pos + hash1EntryLength), hash2.subarray(hash2Pos, hash2Pos + hash2EntryLength));
        } else {
            distance += 8 * Math.max(hash1EntryLength, hash2EntryLength);
        }
        hash1Pos += hash1EntryLength;
        hash2Pos += hash2EntryLength;
    }

    return distance;
}

export async function closeHash(imagePath) {
    return await closeHash_(imagePath, 16, 1/100);
}