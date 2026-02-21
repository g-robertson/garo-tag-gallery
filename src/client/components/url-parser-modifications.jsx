import { METRIC_TYPES } from "../js/metrics.js";
import { clamp, executeFunctions, ReferenceableReact } from "../js/client-util.js";
import HoverInfo from "./hover-info.jsx";
import { State, ConstState } from "../js/state.js";

/** @import {DBLocalMetric} from "../../db/metrics.js" */

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
 *     selectedLocalMetricConstState?: ConstState<DBLocalMetric>
 * }} param0 
 * @returns 
 */
const URLParserModifications = ({selectedLocalMetricConstState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const LocalMetricName = ReferenceableReact();
    const LocalMetricLowerBound = ReferenceableReact();
    const LocalMetricUpperBound = ReferenceableReact();
    const LocalMetricPrecisionFaker = ReferenceableReact();
    const LocalMetricPrecisionReal = ReferenceableReact();
    const LocalMetricMetricType = ReferenceableReact();

    selectedLocalMetricConstState ??= ConstState.instance(undefined);
    const precisionState = new State(selectedLocalMetricConstState.get()?.Local_Metric_Precision ?? 0);
    const metricTypeState = new State(selectedLocalMetricConstState.get()?.Local_Metric_Type ?? METRIC_TYPES.NUMERIC);

    const onAdd = () => {
        const onSelectedLocalMetricChanged = () => {
            metricTypeState.set(selectedLocalMetricConstState.get()?.Local_Metric_Type ?? METRIC_TYPES.NUMERIC);
            LocalMetricName.dom.value = selectedLocalMetricConstState.get()?.Local_Metric_Name ?? "My metric";
            LocalMetricLowerBound.dom.value = selectedLocalMetricConstState.get()?.Local_Metric_Lower_Bound ?? 0;
            LocalMetricUpperBound.dom.value = selectedLocalMetricConstState.get()?.Local_Metric_Upper_Bound ?? 10;
            precisionState.set(selectedLocalMetricConstState.get()?.Local_Metric_Precision ?? 0);
        };
        onSelectedLocalMetricChanged();
        
        const onPrecisionChanged = () => {
            const precision = precisionState.get();
            LocalMetricPrecisionFaker.dom.value = precision;
            LocalMetricPrecisionReal.dom.value = precision;
        };
        onPrecisionChanged();

        const onMetricTypeChanged = () => {
            const metricType = metricTypeState.get();
            if (metricType === METRIC_TYPES.INCDEC) {
                LocalMetricLowerBound.dom.value = 0;
                LocalMetricUpperBound.dom.value = Infinity;
                precisionState.set(0);
            } else if (metricType === METRIC_TYPES.STARS) {
                LocalMetricLowerBound.dom.value = 0;
                LocalMetricUpperBound.dom.value = clamp(Number(LocalMetricUpperBound.dom.value), 1, 20);
                precisionState.set(0);
            }

            LocalMetricPrecisionFaker.dom.disabled = metricType !== METRIC_TYPES.NUMERIC;

            LocalMetricMetricType.dom.value = metricType;
        };
        onMetricTypeChanged();

        selectedLocalMetricConstState.addOnUpdateCallback(onSelectedLocalMetricChanged, addToCleanup);
        precisionState.addOnUpdateCallback(onPrecisionChanged, addToCleanup);
        metricTypeState.addOnUpdateCallback(onMetricTypeChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
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
                    e.currentTarget.value = clampLowerBound(metricTypeState.get(), Number(e.currentTarget.value));
                }} />)}
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose an upper bound number for your rating service: </div>
                {LocalMetricUpperBound.react(<input name="upperBound" type="text" onChange={(e) => {
                    e.currentTarget.value = clampUpperBound(metricTypeState.get(), Number(e.currentTarget.value));
                }} />)}
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a <HoverInfo hoverText="How many fractional digits are stored">precision</HoverInfo> for your rating service: </div>
                {LocalMetricPrecisionFaker.react(<input className="fake-precision-input" type="text" onChange={(e) => {
                    precisionState.set(clampPrecision(metricTypeState.get(), Number(e.currentTarget.value)));
                }} />)}
                {LocalMetricPrecisionReal.react(<input style={{display: "none"}} name="precision" type="text" />)}
            </div>

            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Select what type of rating service you would like this to be: </div>
                {LocalMetricMetricType.react(<select name="metricType" onChange={(e) => {
                    metricTypeState.set(clampServiceType(Number(e.currentTarget.value)));
                }}>
                    <option value={METRIC_TYPES.NUMERIC}>Numeric</option>
                    <option value={METRIC_TYPES.INCDEC}>Inc/Dec</option>
                    <option value={METRIC_TYPES.STARS}>Stars</option>
                </select>)}
            </div>
        </div>
    );
}

export default URLParserModifications;