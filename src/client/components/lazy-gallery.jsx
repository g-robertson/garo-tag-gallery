import { preload } from 'react-dom';
import '../global.css';
import { fbjsonParse, randomID } from '../js/client-util.js';
import LazySelector from './lazy-selector.jsx';
import { METRIC_TYPES } from '../js/metrics.js';
import { useEffect, useRef, useState } from 'react';
import applyMetricToTaggable from '../../api/client-get/apply-metric-to-taggable.js';

/** @import {DBUserFacingLocalFile} from "../../db/taggables.js" */
/** @import {User} from "../js/user.js" */

/**
 * @param {{
 *  user: User
 *  taggableIDs: number[]
 *  initialTaggableID?: number
 *  onValuesDoubleClicked?: (valuesSelected: DBUserFacingLocalFile[]) => void
 * }} param0
 */
const LazyGallery = ({user, taggableIDs, initialTaggableID, onValuesDoubleClicked}) => {
    /** @type {[Map<number, number>, (metricValuesMap: Map<number, number>) => void]} */
    const [metricValuesMap, setMetricValuesMap] = useState(new Map());
    const [metricStarsHovered, setMetricStarsHovered] = useState({localMetricID: -1, starsHovered: -1});
    const galleryID = useRef(randomID(32));
    const visibleTaggableID = useRef(-1);
    let initialLastClickedIndex = taggableIDs.indexOf(initialTaggableID);
    if (initialLastClickedIndex === -1) {
        initialLastClickedIndex = 0;
    }

    const VIDEO_ID = `video-${galleryID}`;

    useEffect(() => {
        const vid = document.getElementById(VIDEO_ID);
        if (vid !== null) {
            vid.load();
        }
    }, [metricValuesMap]);

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
        customItemComponent={({realizedValue, setRealizedValue}) => {
            if (visibleTaggableID.current !== realizedValue.Taggable_ID) {
                visibleTaggableID.current = realizedValue.Taggable_ID;
                console.log(realizedValue);
                setMetricValuesMap(new Map(realizedValue.Metrics.map(metric => [metric.Local_Metric_ID, metric])));
            }
            const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm"];
            const src = `images-database/${realizedValue.File_Hash.slice(0, 2)}/${realizedValue.File_Hash.slice(2, 4)}/${realizedValue.File_Hash}${realizedValue.File_Extension}`;

            return <div style={{width: "100%", height: "100%", justifyContent: "center"}}>
                <div style={{position: "absolute", top: "3vh", right: "0vh", flexDirection: "column"}}>
                    {user.localMetricServices().map(localMetricService => localMetricService.Local_Metrics).flat().map(localMetric => (<div>
                        <div style={{flexDirection: "column", justifyItems: "center"}}>{localMetric.Local_Metric_Name}</div> {
                            localMetric.Local_Metric_Type === METRIC_TYPES.STARS
                          ? (() => {
                            const metricStars = [];
                            const metricStarsHighlighted = metricValuesMap.get(localMetric.Local_Metric_ID)?.Applied_Value ?? 0;
                            const metricStarsHoveredInner = metricStarsHovered.localMetricID === localMetric.Local_Metric_ID ? metricStarsHovered.starsHovered : 0;
                            for (let i = 1; i <= localMetric.Local_Metric_Upper_Bound; ++i) {
                                metricStars.push(
                                    <span class={`metric-star${(metricStarsHighlighted >= i ? " selected" : "")}${metricStarsHoveredInner >= i ? " hovered" : ""}`}
                                          onClick={async () => {
                                              let newMetricStarsHighlighted = 0;
                                              if (metricStarsHighlighted !== i) {
                                                  newMetricStarsHighlighted = i;
                                              }

                                              await applyMetricToTaggable(Number(realizedValue.Taggable_ID), localMetric.Local_Metric_ID, i);

                                              const newAppliedMetric = {
                                                ...realizedValue.Metrics.find(metric => metric.Local_Metric_ID === localMetric.Local_Metric_ID),
                                                Local_Metric_ID: localMetric.Local_Metric_ID,
                                                Applied_Value: newMetricStarsHighlighted
                                              };

                                              metricValuesMap.set(localMetric.Local_Metric_ID, newAppliedMetric);
                                              setMetricValuesMap(new Map(metricValuesMap));
                                              setRealizedValue({
                                                ...realizedValue,
                                                Metrics: [
                                                    ...realizedValue.Metrics.filter(metric => metric.Local_Metric_ID !== localMetric.Local_Metric_ID),
                                                    newAppliedMetric
                                                ]
                                              });
                                          }}
                                          onMouseOver={() => {
                                            setMetricStarsHovered({localMetricID: localMetric.Local_Metric_ID, starsHovered: i});
                                          }}
                                          onMouseLeave={() => {
                                            setMetricStarsHovered({localMetricID: -1, starsHovered: -1});
                                          }}
                                    >★</span>
                                );
                            }

                            return metricStars;
                          })()
                          : <></>}
                    </div>))}
                </div>

                {(VIDEO_FILE_EXTENSIONS.indexOf(realizedValue.File_Extension) !== -1)
                ? <video id={VIDEO_ID} className="gallery-content" controls={true}>
                    <source src={src}></source>
                </video>
                : <img className="gallery-content" src={src} />
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