import '../global.css';
import { executeFunctions, fbjsonParse, preloadImg, ReferenceableReact, VIDEO_FILE_EXTENSIONS } from '../js/client-util.js';
import LazySelector from './lazy-selector.jsx';
import { METRIC_TYPES } from '../js/metrics.js';
import applyMetricToTaggable from '../../api/client-get/apply-metric-to-taggable.js';
import { User } from '../js/user.js';
import { ConstState, State } from '../page/pages.js';

/** @import {DBUserFacingLocalFile} from "../../db/taggables.js" */

/**
 * @param {{
 *  taggableIDs: number[]
 *  initialTaggableIndex?: number
 * }} param0
 */
const LazyGallery = ({taggableIDs, initialTaggableIndex}) => {
    const MetricsElement = ReferenceableReact();
    const localMetricServicesState = User.Global().localMetricServicesState();

    initialTaggableIndex ??= 0;
    if (initialTaggableIndex < 0) {
        initialTaggableIndex = 0;
    }

    return <LazySelector
        valuesConstState={ConstState.instance(taggableIDs)}
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
                preloadImg(`images-database/${taggableResponse.File_Hash.slice(0, 2)}/${taggableResponse.File_Hash.slice(2, 4)}/${taggableResponse.File_Hash}${taggableResponse.File_Extension}`, {
                    "fetchPriority": "high",
                    "as": "image"
                });
            }
            return values.map(taggableID => taggablesResponseMap.get(taggableID));
        }}
        customItemComponent={({realizedValue, index, setRealizedValue}) => {
            const src = `images-database/${realizedValue.File_Hash.slice(0, 2)}/${realizedValue.File_Hash.slice(2, 4)}/${realizedValue.File_Hash}${realizedValue.File_Extension}`;

            return <div className="gallery-item" style={{width: "100%", height: "100%", justifyContent: "center"}}>
                <div style={{position: "absolute", bottom: "4px", left: "4px"}}>
                    {index + 1} / {taggableIDs.length}
                </div>
                {MetricsElement.react(<div style={{position: "absolute", top: "3vh", right: "0", flexDirection: "column"}} onAdd={() => {
                    /** @type {(() => void)[]} */
                    const addToCleanup = [];

                    const metricsValuesMapState = new State(new Map(realizedValue.Metrics.map(metric => [metric.Local_Metric_ID, metric])));
                    const metricStarsHoveredState = new State({localMetricID: -1, starsHovered: -1})

                    const onMetricsChanged = () => {
                        const metricValuesMap = metricsValuesMapState.get();
                        const metricStarsHovered = metricStarsHoveredState.get();
                        MetricsElement.dom.replaceChildren(...localMetricServicesState.get().map(
                            localMetricService => localMetricService.Local_Metrics
                        ).flat().map(localMetric => (<div dom className="metric-visual-container">
                            <div style={{flexDirection: "column", justifyItems: "center"}}>{localMetric.Local_Metric_Name}</div>
                            {
                                localMetric.Local_Metric_Type === METRIC_TYPES.STARS ? (() => {
                                    const metricStars = [];
                                    const metricStarsHighlighted = metricValuesMap.get(localMetric.Local_Metric_ID)?.Applied_Value ?? 0;
                                    const metricStarsHoveredInner = metricStarsHovered.localMetricID === localMetric.Local_Metric_ID ? metricStarsHovered.starsHovered : 0;
                                    for (let i = 1; i <= localMetric.Local_Metric_Upper_Bound; ++i) {
                                        metricStars.push(
                                            <span className={`metric-star${(metricStarsHighlighted >= i ? " selected" : "")}${metricStarsHoveredInner >= i ? " hovered" : ""}`}
                                                  onClick={async () => {
                                                      let newMetricStarsHighlighted = 0;
                                                      if (metricStarsHighlighted !== i) {
                                                          newMetricStarsHighlighted = i;
                                                      }
    
    
                                                      const newAppliedMetric = {
                                                        ...realizedValue.Metrics.find(metric => metric.Local_Metric_ID === localMetric.Local_Metric_ID),
                                                        Local_Metric_ID: localMetric.Local_Metric_ID,
                                                        Applied_Value: newMetricStarsHighlighted
                                                      };
    
                                                      metricValuesMap.set(localMetric.Local_Metric_ID, newAppliedMetric);
                                                      metricsValuesMapState.forceUpdate();
                                                      setRealizedValue({
                                                        ...realizedValue,
                                                        Metrics: [
                                                            ...realizedValue.Metrics.filter(metric => metric.Local_Metric_ID !== localMetric.Local_Metric_ID),
                                                            newAppliedMetric
                                                        ]
                                                      });
    
                                                      await applyMetricToTaggable(Number(realizedValue.Taggable_ID), localMetric.Local_Metric_ID, i);
                                                  }}
                                                  onMouseOver={() => {
                                                    metricStarsHoveredState.set({localMetricID: localMetric.Local_Metric_ID, starsHovered: i});
                                                  }}
                                                  onMouseLeave={() => {
                                                    metricStarsHoveredState.set({localMetricID: -1, starsHovered: -1});
                                                  }}
                                            >★</span>
                                        );
                                    }
                                    return metricStars;
                                })()
                                : <></>
                            }
                        </div>)));
                    };
                    onMetricsChanged();
                    
                    localMetricServicesState.addOnUpdateCallback(onMetricsChanged, addToCleanup);
                    metricsValuesMapState.addOnUpdateCallback(onMetricsChanged, addToCleanup);
                    metricStarsHoveredState.addOnUpdateCallback(onMetricsChanged, addToCleanup);
                    return () => executeFunctions(addToCleanup);
                }}></div>)}

                {VIDEO_FILE_EXTENSIONS.has(realizedValue.File_Extension)
                ? <video className="gallery-content" controls={true}>
                        <source src={src}></source>
                </video>
                : <img className="gallery-content" src={src} />
                }
            </div>
        }}
        customTitleRealizer={() => ""}
        valueRealizationDelay={50}
        valueRealizationRange={3}
        itemProperties={{
            width: "100%",
            height: "100%"
        }}
        scrollbarIncrement={1}
        scrollbarWidth={0}
        initialLastClickedIndex={initialTaggableIndex}
        elementsSelectable={false}
    />
};

export default LazyGallery;