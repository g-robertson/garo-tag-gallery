import { preload } from 'react-dom';
import '../global.css';
import { fbjsonParse } from '../js/client-util.js';
import LazySelector from './lazy-selector.jsx';

/** @import {DBUserFacingLocalFile} from "../../db/taggables.js" */

/**
 * @param {{
 *  taggableIDs: number[]
 *  initialTaggableID?: number
 *  onValuesDoubleClicked?: (valuesSelected: DBUserFacingLocalFile[]) => void
 * }} param0
 */
const LazyGallery = ({taggableIDs, initialTaggableID, onValuesDoubleClicked}) => {
    let initialLastClickedIndex = taggableIDs.indexOf(initialTaggableID);
    if (initialLastClickedIndex === -1) {
        initialLastClickedIndex = 0;
    }

    return <LazySelector
        values={taggableIDs}
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
                preload(`images-database/${taggableResponse.File_Hash.slice(0, 2)}/${taggableResponse.File_Hash.slice(2, 4)}/${taggableResponse.File_Hash}${taggableResponse.File_Extension}`, {
                    "fetchPriority": "high",
                    "as": "image"
                });
            }
            return values.map(taggableID => taggablesResponseMap.get(taggableID));
        }}
        customItemComponent={({realizedValue}) => {
            const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm"];
            const src = `images-database/${realizedValue.File_Hash.slice(0, 2)}/${realizedValue.File_Hash.slice(2, 4)}/${realizedValue.File_Hash}${realizedValue.File_Extension}`;

            return <div style={{width: "100%", height: "100%", justifyContent: "center"}}>
                {(VIDEO_FILE_EXTENSIONS.indexOf(realizedValue.File_Extension) !== -1)
                ? <video controls={true}>
                    <source src={src}></source>
                </video>
                : <img src={src} />
                }
            </div>
        }}
        onValuesDoubleClicked={onValuesDoubleClicked}
        customTitleRealizer={() => ""}
        valueRealizationDelay={50}
        valueRealizationRange={5}
        itemWidth={"100%"}
        itemHeight={"100%"}
        scrollbarIncrement={1}
        scrollbarWidth={0}
        preloadRealizedItems={true}
        initialLastClickedIndex={initialLastClickedIndex}
        elementsSelectable={false}
    />
};

export default LazyGallery;