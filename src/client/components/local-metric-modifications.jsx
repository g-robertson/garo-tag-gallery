import { METRIC_TYPES } from "../js/metrics.js";
import { clamp, ReferenceableReact } from "../js/client-util.js";
import HoverInfo from "./hover-info.jsx";
import { ExistingState } from "../page/pages.js";

/** @import {DBLocalMetric} from "../../db/metrics.js" */
/** @import {ExistingStateConstRef} from "../page/pages.js" */

function clampServiceType(metricType) {
    if (isNaN(metricType)) {
        metricType = 0;
    }

    return clamp(Math.floor(metricType), 0, 2);
}

/**
 * @param {number} metricType 
 * @param {number} lowerBound 
 */
function clampLowerBound(metricType, lowerBound) {
    if (isNaN(lowerBound)) {
        return 0;
    }

    if (metricType === METRIC_TYPES.STARS) {
        return 0;
    }

    return lowerBound;
}

/**
 * @param {number} metricType 
 * @param {number} upperBound 
 */
function clampUpperBound(metricType, upperBound) {
    if (isNaN(upperBound)) {
        return 1;
    }

    if (metricType === METRIC_TYPES.STARS) {
        return clamp(upperBound, 1, 20);
    }
    
    return upperBound;
}

function clampPrecision(metricType, precision) {
    if (metricType !== METRIC_TYPES.NUMERIC) {
        return 0;
    } else {
        return clamp(precision, 0, 9);
    }
}

/**
 * @param {{
 *     selectedLocalMetricConstRef?: ExistingStateConstRef<DBLocalMetric>
 * }} param0 
 * @returns 
 */
const LocalMetricModifications = ({selectedLocalMetricConstRef}) => {
    selectedLocalMetricConstRef ??= ExistingState.stateRef(undefined);
    const LocalMetricName = ReferenceableReact();
    const LocalMetricLowerBound = ReferenceableReact();
    const LocalMetricUpperBound = ReferenceableReact();
    const LocalMetricPrecisionFaker = ReferenceableReact();
    const LocalMetricPrecisionReal = ReferenceableReact();
    const LocalMetricMetricType = ReferenceableReact();


    const precisionRef = ExistingState.stateRef(selectedLocalMetricConstRef.get()?.Local_Metric_Precision ?? 0);
    const metricTypeRef = ExistingState.stateRef(selectedLocalMetricConstRef.get()?.Local_Metric_Type ?? METRIC_TYPES.NUMERIC);

    const onAdd = () => {
        const onSelectedLocalMetricChanged = () => {
            metricTypeRef.update(selectedLocalMetricConstRef.get()?.Local_Metric_Type ?? METRIC_TYPES.NUMERIC);
            LocalMetricName.dom.value = selectedLocalMetricConstRef.get()?.Local_Metric_Name ?? "My metric";
            LocalMetricLowerBound.dom.value = selectedLocalMetricConstRef.get()?.Local_Metric_Lower_Bound ?? 0;
            LocalMetricUpperBound.dom.value = selectedLocalMetricConstRef.get()?.Local_Metric_Upper_Bound ?? 10;
            precisionRef.update(selectedLocalMetricConstRef.get()?.Local_Metric_Precision ?? 0);
        };
        onSelectedLocalMetricChanged();
        
        const onPrecisionChanged = () => {
            const precision = precisionRef.get();
            LocalMetricPrecisionFaker.dom.value = precision;
            LocalMetricPrecisionReal.dom.value = precision;
        };
        onPrecisionChanged();

        const onMetricTypeChanged = () => {
            const metricType = metricTypeRef.get();
            if (metricType === METRIC_TYPES.INCDEC) {
                LocalMetricLowerBound.dom.value = 0;
                LocalMetricUpperBound.dom.value = Infinity;
                precisionRef.update(0);
            } else if (metricType === METRIC_TYPES.STARS) {
                LocalMetricLowerBound.dom.value = 0;
                LocalMetricUpperBound.dom.value = clamp(Number(LocalMetricUpperBound.dom.value), 1, 20);
                precisionRef.update(0);
            }

            LocalMetricPrecisionFaker.dom.disabled = metricType !== METRIC_TYPES.NUMERIC;

            LocalMetricMetricType.dom.value = metricType;
        };
        onMetricTypeChanged();

        let cleanup = () => {};
        cleanup = selectedLocalMetricConstRef.addOnUpdateCallback(onSelectedLocalMetricChanged, cleanup);
        cleanup = precisionRef.addOnUpdateCallback(onPrecisionChanged, cleanup);
        cleanup = metricTypeRef.addOnUpdateCallback(onMetricTypeChanged, cleanup);
        return cleanup;
    };
    
    return (
        <div style={{marginLeft: "8px", flexDirection: "column"}} onAdd={onAdd}>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a name for your metric: </div>
                {LocalMetricName.react(<input name="metricName" type="text" />)}
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a lower bound number for your rating service: </div>
                {LocalMetricLowerBound.react(<input name="lowerBound" type="text" onChange={(e) => {
                    e.currentTarget.value = clampLowerBound(metricTypeRef.get(), Number(e.currentTarget.value));
                }} />)}
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose an upper bound number for your rating service: </div>
                {LocalMetricUpperBound.react(<input name="upperBound" type="text" onChange={(e) => {
                    e.currentTarget.value = clampUpperBound(metricTypeRef.get(), Number(e.currentTarget.value));
                }} />)}
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a <HoverInfo hoverText="How many fractional digits are stored">precision</HoverInfo> for your rating service: </div>
                {LocalMetricPrecisionFaker.react(<input className="fake-precision-input" type="text" onChange={(e) => {
                    precisionRef.update(clampPrecision(metricTypeRef.get(), Number(e.currentTarget.value)));
                }} />)}
                {LocalMetricPrecisionReal.react(<input style={{display: "none"}} name="precision" type="text" />)}
            </div>

            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Select what type of rating service you would like this to be: </div>
                {LocalMetricMetricType.react(<select name="metricType" onChange={(e) => {
                    metricTypeRef.update(clampServiceType(Number(e.currentTarget.value)));
                }}>
                    <option value={METRIC_TYPES.NUMERIC}>Numeric</option>
                    <option value={METRIC_TYPES.INCDEC}>Inc/Dec</option>
                    <option value={METRIC_TYPES.STARS}>Stars</option>
                </select>)}
            </div>
        </div>
    );
}

export default LocalMetricModifications;