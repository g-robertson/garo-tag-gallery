import { preload } from 'react-dom';
import '../global.css';
import { fbjsonParse } from '../js/client-util.js';
import LazySelector from './lazy-selector.jsx';

const THUMB_ORIGINAL_WIDTH = 300;
const THUMB_ORIGINAL_HEIGHT = 200;

const THUMB_WIDTH = 150;
const THUMB_HEIGHT = THUMB_WIDTH * (THUMB_ORIGINAL_HEIGHT / THUMB_ORIGINAL_WIDTH);

/** @import {DBUserFacingLocalFile} from "../../db/taggables.js" */

/**
 * @param {{
 *  taggableIDs: number[]
 *  onValuesSelected?: (valuesSelected: DBUserFacingLocalFile[], indices: number[]) => void
 *  onValuesDoubleClicked?: (valuesSelected: DBUserFacingLocalFile[], indices: number[], indexClicked: number) => void
 * }} param0
 */
const LazyThumbnailGallery = ({taggableIDs, onValuesSelected, onValuesDoubleClicked}) => {
    onValuesSelected ??= () => {};
    onValuesDoubleClicked ??= () => {};

    return <LazySelector
        values={taggableIDs}
        realizeSelectedValues={false}
        valuesRealizer={async (values) => {
            const response = await fetch("/api/post/select-user-facing-taggables", {
                body: JSON.stringify({
                    taggableIDs: values
                }),
                headers: {
                  "Content-Type": "application/json",
                },
                method: "POST"
            });
        
            /** @type {DBUserFacingLocalFile[]} */
            const taggablesResponse = await fbjsonParse(response);
            const taggablesResponseMap = new Map(taggablesResponse.map(taggable => [Number(taggable.Taggable_ID), taggable]));
            for (const taggableResponse of taggablesResponse) {
                preload(`images-database/${taggableResponse.File_Hash.slice(0, 2)}/${taggableResponse.File_Hash.slice(2, 4)}/${taggableResponse.File_Hash}.thumb.jpg`, {
                    "fetchPriority": "high",
                    "as": "image"
                });
            }
            return values.map(taggableID => taggablesResponseMap.get(taggableID));
        }}
        customItemComponent={({realizedValue}) => {
            const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm"];

            return <div className="lazy-selector-selectable-item-portion" style={{width: "100%", height: "100%", justifyContent: "center"}}>
                {VIDEO_FILE_EXTENSIONS.indexOf(realizedValue.File_Extension) !== -1
                 ? <img className="lazy-selector-selectable-item-portion"
                         src="assets/video.png"
                         style={{position: "absolute", width: THUMB_WIDTH, height: THUMB_HEIGHT, opacity: .7}}
                    />
                 : ""}
                <img className="lazy-selector-selectable-item-portion"
                     style={{maxWidth: THUMB_WIDTH}}
                     src={`images-database/${realizedValue.File_Hash.slice(0, 2)}/${realizedValue.File_Hash.slice(2, 4)}/${realizedValue.File_Hash}.thumb.jpg`}
                />
            </div>
        }}
        onValuesDoubleClicked={onValuesDoubleClicked}
        onValuesSelected={onValuesSelected}
        customTitleRealizer={(realizedValue) => realizedValue.Tags.sort((a, b) => {
            if (a < b) {
                return -1;
            } else if (a > b) {
                return 1;
            } else {
                return 0;
            }
        }).join(" ")}
        valueRealizationDelay={25}
        valueRealizationRange={2}
        realizeMinimumCount={30}
        itemProperties={{
            width: THUMB_WIDTH,
            height: THUMB_HEIGHT,
            horizontalMargin: 4,
            verticalMargin: 4
        }}
        scrollbarIncrement={1}
    />
};

export default LazyThumbnailGallery;