import { preload } from 'react-dom';
import '../global.css';
import LazySelector from './lazy-selector.jsx';
import selectFiles from '../../api/client-get/select-files.js';

const THUMB_ORIGINAL_WIDTH = 300;
const THUMB_ORIGINAL_HEIGHT = 200;

const THUMB_WIDTH = 150;
const THUMB_HEIGHT = THUMB_WIDTH * (THUMB_ORIGINAL_HEIGHT / THUMB_ORIGINAL_WIDTH);
const DISTANCE_HEIGHT = 0;

/** @import {DBJoinedLocalFile} from "../../db/taggables.js" */
/** @import {DBFileComparison} from "../../db/duplicates.js" */

/**
 * @param {{
 *  fileComparisonPairs: DBFileComparison[]
 *  onValuesDoubleClicked?: (valuesSelected: any, indices: number[], indexClicked: number) => void
 * }} param0
 */
const LazyDedupePreviewGallery = ({fileComparisonPairs, onValuesDoubleClicked}) => {
    onValuesDoubleClicked ??= () => {};

    return <LazySelector
        valuesConstRef={fileComparisonPairs}
        realizeSelectedValues={false}
        valuesRealizer={async (values) => {
            /** @type {Set<number>} */
            const filesSet = new Set();
            for (const value of values) {
                filesSet.add(value.File_ID_1);
                filesSet.add(value.File_ID_2);
            }
            const fileMap = new Map((await selectFiles([...filesSet])).map(file => [
                file.File_ID,
                file
            ]));
            
            for (const file of fileMap.values()) {
                preload(`images-database/${file.File_Hash.slice(0, 2)}/${file.File_Hash.slice(2, 4)}/${file.File_Hash}.thumb.jpg`, {
                    "fetchPriority": "high",
                    "as": "image"
                });
            }
            return values.map(value => ({
                ...value,
                File_1: fileMap.get(value.File_ID_1),
                File_2: fileMap.get(value.File_ID_2)
            }));
        }}
        customItemComponent={({realizedValue}) => {
            const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm"];
            return <div className="lazy-selector-selectable-item-portion" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                <div className="lazy-selector-selectable-item-portion" style={{height: THUMB_HEIGHT}}>
                    <div className="lazy-selector-selectable-item-portion" style={{width: "50%", justifyContent: "center"}}>
                        {VIDEO_FILE_EXTENSIONS.indexOf(realizedValue.File_1.File_Extension) !== -1
                         ? <img className="lazy-selector-selectable-item-portion"
                                 src="assets/video.png"
                                 style={{position: "absolute", width: THUMB_WIDTH, height: THUMB_HEIGHT, opacity: .7}}
                            />
                         : ""}
                        <img className="lazy-selector-selectable-item-portion"
                             style={{maxWidth: THUMB_WIDTH}}
                             src={`images-database/${realizedValue.File_1.File_Hash.slice(0, 2)}/${realizedValue.File_1.File_Hash.slice(2, 4)}/${realizedValue.File_1.File_Hash}.thumb.jpg`}
                        />
                    </div>
                    <div className="lazy-selector-selectable-item-portion" style={{width: "50%", justifyContent: "center"}}>
                        {VIDEO_FILE_EXTENSIONS.indexOf(realizedValue.File_2.File_Extension) !== -1
                         ? <img className="lazy-selector-selectable-item-portion"
                                 src="assets/video.png"
                                 style={{position: "absolute", width: THUMB_WIDTH, height: THUMB_HEIGHT, opacity: .7}}
                            />
                         : ""}
                        <img className="lazy-selector-selectable-item-portion"
                             style={{maxWidth: THUMB_WIDTH}}
                             src={`images-database/${realizedValue.File_2.File_Hash.slice(0, 2)}/${realizedValue.File_2.File_Hash.slice(2, 4)}/${realizedValue.File_2.File_Hash}.thumb.jpg`}
                        />
                    </div>
                </div>
                <div style={{height: DISTANCE_HEIGHT, justifyContent: "center", overflow: "hidden", lineHeight: `${24}px`}}>
                    Distance: {realizedValue.Perceptual_Hash_Distance}
                </div>
            </div>
        }}
        onValuesDoubleClicked={onValuesDoubleClicked}
        valueRealizationDelay={25}
        valueRealizationRange={2}
        realizeMinimumCount={30}
        itemProperties={{
            width: (THUMB_WIDTH * 2) + 4,
            height: THUMB_HEIGHT + DISTANCE_HEIGHT,
            horizontalMargin: 4,
            verticalMargin: 4
        }}
        scrollbarIncrement={1}
    />
};

export default LazyDedupePreviewGallery;