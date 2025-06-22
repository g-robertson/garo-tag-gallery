import sharp from "sharp";
import { sha256 } from "../util.js";
import shuffle from "knuth-shuffle-seeded";

export async function exactDuplicateHash(imagePath) {
    return sha256(await sharp(imagePath).raw().toBuffer());
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
        return undefined;
    }

    const {data: imageBytes, info} = sharpInfo;

    let img;
    let composites = [];
    if (visualize) {
        img = sharp({
            create: {
                width: info.width,
                height: info.height,
                channels: 4,
                background: {r:255, g:0, b: 255, alpha: 0.5}
            }
        });
    }

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
        await img.composite(composites).png().toFile(`${imagePath}.closehash.png`);
    }

    return buf;
}

export async function blurHash(imagePath) {
    return await blurHash_(imagePath, 7, 64, 4, false);
}

/** @type {Uint32Array[]} */
const REUSED_CONVOLUTION_ARRAYS = [];

/** @type {Uint32Array[]} */
const REUSED_COLUMN_ARRAYS = [];

/**
 * @param {string} imagePath 
 * @param {number} convolutionPercentage
 * @param {number} stepPercentage
 */
async function closeHash_(imagePath, convolutionPercentage, stepPercentage) {
    let sharpRead;
    try {
        sharpRead = await sharp(imagePath).raw().toBuffer({resolveWithObject: true});
    } catch (e) {
        return undefined;
    }
    const {data: imageBytes, info} = sharpRead;
    const CHANNEL_COUNT = info.channels;

    let CONVOLVE_WIDTH = Math.floor(info.width * convolutionPercentage);
    if (CONVOLVE_WIDTH % 2 === 0) {
        --CONVOLVE_WIDTH;
    }
    const CONVOLVE_HALF_WIDTH = Math.floor(CONVOLVE_WIDTH / 2);
    const CONVOLVE_HEIGHT = Math.floor(info.height * convolutionPercentage);

    const STEP_Y = Math.max(1, Math.round(info.height * stepPercentage));

    const RANGE_COUNT = 8;
    const RANGE_WIDTH = 256 / RANGE_COUNT;
    const RANGE_RSH = Math.log2(RANGE_WIDTH);

    const ARRAY_WIDTH = info.width + CONVOLVE_HALF_WIDTH;
    for (let ri = 0; ri < RANGE_COUNT; ++ri) {
        if (REUSED_CONVOLUTION_ARRAYS[ri] === undefined || REUSED_CONVOLUTION_ARRAYS[ri].length < ARRAY_WIDTH * info.height * 3) {
            REUSED_CONVOLUTION_ARRAYS[ri] = new Uint32Array(ARRAY_WIDTH * info.height * 3);
            REUSED_COLUMN_ARRAYS[ri] = new Uint32Array(ARRAY_WIDTH * info.height * 3);
        }

        for (let x = info.width - 1; x >= info.width - CONVOLVE_WIDTH; --x) {
            for (let y = 0; y < info.height - CONVOLVE_HEIGHT; y += STEP_Y) {
                const previousPositiveConvolutionPosition = 3 * ((x + 1) + (y * ARRAY_WIDTH));
                const previousNegativeColumnPosition = 3 * ((x + CONVOLVE_HALF_WIDTH) + (y * ARRAY_WIDTH));
                // refresh important indices of REUSED_CONV_ARRAYS
                REUSED_CONVOLUTION_ARRAYS[ri][previousPositiveConvolutionPosition + 0] = 0;
                REUSED_CONVOLUTION_ARRAYS[ri][previousPositiveConvolutionPosition + 1] = 0;
                REUSED_CONVOLUTION_ARRAYS[ri][previousPositiveConvolutionPosition + 2] = 0;
                REUSED_COLUMN_ARRAYS[ri][previousNegativeColumnPosition + 0] = 0;
                REUSED_COLUMN_ARRAYS[ri][previousNegativeColumnPosition + 1] = 0;
                REUSED_COLUMN_ARRAYS[ri][previousNegativeColumnPosition + 2] = 0;
            }
        }
    }

    const indicesWithConvolutions = [];
    for (let x = info.width - 1; x >= 0; --x) {
        for (let y = 0; y < info.height - CONVOLVE_HEIGHT; y += STEP_Y) {
            const selfArrayPosition = 3 * (x + (y * ARRAY_WIDTH));
            indicesWithConvolutions.push({x, y, index: selfArrayPosition});
            const previousPositiveConvolutionPosition = 3 * ((x + 1) + (y * ARRAY_WIDTH));
            const previousNegativeColumnPosition = 3 * ((x + CONVOLVE_HALF_WIDTH) + (y * ARRAY_WIDTH));
            // copy previous convolutions and columns into self
            for (let ri = 0; ri < RANGE_COUNT; ++ri) {
                REUSED_COLUMN_ARRAYS[ri][selfArrayPosition + 0] = 0;
                REUSED_COLUMN_ARRAYS[ri][selfArrayPosition + 1] = 0;
                REUSED_COLUMN_ARRAYS[ri][selfArrayPosition + 2] = 0;
                REUSED_CONVOLUTION_ARRAYS[ri][selfArrayPosition + 0] = REUSED_CONVOLUTION_ARRAYS[ri][previousPositiveConvolutionPosition + 0] - REUSED_COLUMN_ARRAYS[ri][previousNegativeColumnPosition + 0];
                REUSED_CONVOLUTION_ARRAYS[ri][selfArrayPosition + 1] = REUSED_CONVOLUTION_ARRAYS[ri][previousPositiveConvolutionPosition + 1] - REUSED_COLUMN_ARRAYS[ri][previousNegativeColumnPosition + 1];
                REUSED_CONVOLUTION_ARRAYS[ri][selfArrayPosition + 2] = REUSED_CONVOLUTION_ARRAYS[ri][previousPositiveConvolutionPosition + 2] - REUSED_COLUMN_ARRAYS[ri][previousNegativeColumnPosition + 2];
            }

            for (let dy = 0; dy < CONVOLVE_HEIGHT; ++dy) {
                const pixelPosition = CHANNEL_COUNT * (x + ((y + dy) * info.width));
                const rPixelVal = imageBytes[pixelPosition + 0];
                const gPixelVal = imageBytes[pixelPosition + 1];
                const bPixelVal = imageBytes[pixelPosition + 2];
                REUSED_COLUMN_ARRAYS[rPixelVal >> RANGE_RSH][selfArrayPosition + 0] += rPixelVal;
                REUSED_COLUMN_ARRAYS[gPixelVal >> RANGE_RSH][selfArrayPosition + 1] += gPixelVal;
                REUSED_COLUMN_ARRAYS[bPixelVal >> RANGE_RSH][selfArrayPosition + 2] += bPixelVal;
                REUSED_CONVOLUTION_ARRAYS[rPixelVal >> RANGE_RSH][selfArrayPosition + 0] += rPixelVal;
                REUSED_CONVOLUTION_ARRAYS[gPixelVal >> RANGE_RSH][selfArrayPosition + 1] += gPixelVal;
                REUSED_CONVOLUTION_ARRAYS[bPixelVal >> RANGE_RSH][selfArrayPosition + 2] += bPixelVal;
            }
        }
    }

    const buf = Buffer.alloc((2 * RANGE_COUNT - 1) * 16);

    for (const indexWithConvolution of indicesWithConvolutions) {
        const {x, y, index} = indexWithConvolution;
        if (x + CONVOLVE_WIDTH >= info.width) {
            continue;
        }

        for (let ri = 0; ri < RANGE_COUNT; ++ri) {
            const averageRed = (REUSED_CONVOLUTION_ARRAYS[ri][index + 0] + REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 0]) / (CONVOLVE_WIDTH * CONVOLVE_HEIGHT);
            const averageGreen = (REUSED_CONVOLUTION_ARRAYS[ri][index + 1] + REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 1]) / (CONVOLVE_WIDTH * CONVOLVE_HEIGHT);
            const averageBlue = (REUSED_CONVOLUTION_ARRAYS[ri][index + 2] + REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 2]) / (CONVOLVE_WIDTH * CONVOLVE_HEIGHT);
            const diffRed = Math.round(Math.abs((REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 0] - REUSED_CONVOLUTION_ARRAYS[ri][index + 0]) / (CONVOLVE_HALF_WIDTH * CONVOLVE_HEIGHT)));
            if (diffRed > buf[(ri * 16) + 0]) {
                buf[(ri * 16) + 0] = diffRed;
                buf[(ri * 16) + 1] = averageRed;
                buf[(ri * 16) + 2] = averageGreen;
                buf[(ri * 16) + 3] = averageBlue;
            }
            const diffGreen = Math.round(Math.abs((REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 1] - REUSED_CONVOLUTION_ARRAYS[ri][index + 1]) / (CONVOLVE_HALF_WIDTH * CONVOLVE_HEIGHT)));
            if (diffGreen > buf[(ri * 16) + 4]) {
                buf[(ri * 16) + 4] = diffGreen;
                buf[(ri * 16) + 5] = averageRed;
                buf[(ri * 16) + 6] = averageGreen;
                buf[(ri * 16) + 7] = averageBlue;
            }
            const diffBlue = Math.round(Math.abs((REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 2] - REUSED_CONVOLUTION_ARRAYS[ri][index + 2]) / (CONVOLVE_HALF_WIDTH * CONVOLVE_HEIGHT)));
            if (diffBlue > buf[(ri * 16) + 8]) {
                buf[(ri * 16) + 8] = diffBlue;
                buf[(ri * 16) + 9] = averageRed;
                buf[(ri * 16) +10] = averageGreen;
                buf[(ri * 16) +11] = averageBlue;
            }
            const diffSum = Math.round(Math.abs((
                (REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 0] + REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 1] + REUSED_CONVOLUTION_ARRAYS[ri][index + CONVOLVE_HALF_WIDTH + 2])
              - (REUSED_CONVOLUTION_ARRAYS[ri][index + 0] + REUSED_CONVOLUTION_ARRAYS[ri][index + 1] + REUSED_CONVOLUTION_ARRAYS[ri][index + 2])
            ) / (CONVOLVE_HALF_WIDTH * CONVOLVE_HEIGHT)));
            if (diffSum > buf[(ri * 16) + 12]) {
                buf[(ri * 16) +12] = diffSum;
                buf[(ri * 16) +13] = averageRed;
                buf[(ri * 16) +14] = averageGreen;
                buf[(ri * 16) +15] = averageBlue;
            }
        }
    }

    return buf;
}

/**
 * 
 * @param {Buffer} hash1 
 * @param {Buffer} hash2 
 */
export function closeHashDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; ++i) {
        distance += Math.abs(hash1[i] - hash2[i]);
    }
    return distance;
}

export async function closeHash(imagePath) {
    return await closeHash_(imagePath, 1/8, 1/4);
}