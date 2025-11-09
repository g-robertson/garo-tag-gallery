import { useEffect, useState } from "react";
import { METRIC_TYPES } from "../js/metrics.js";
import { clamp } from "../js/client-util.js";
import HoverInfo from "./hover-info.jsx";

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
 *     selectedLocalMetric?: DBLocalMetric
 * }} param0 
 * @returns 
 */
const LocalMetricModifications = ({selectedLocalMetric}) => {
    const [metricName, setMetricName] = useState(selectedLocalMetric?.Local_Metric_Name ?? "My metric")
    const [lowerBound, setLowerBound] = useState(selectedLocalMetric?.Local_Metric_Lower_Bound ?? 0);
    const [upperBound, setUpperBound] = useState(selectedLocalMetric?.Local_Metric_Upper_Bound ?? 10);
    const [precision, setPrecision] = useState(selectedLocalMetric?.Local_Metric_Precision ?? 0);
    const [metricType, setMetricType] = useState(selectedLocalMetric?.Local_Metric_Type ?? 0);
    useEffect(() => {
        setMetricName(selectedLocalMetric?.Local_Metric_Name ?? "My metric");
        setLowerBound(selectedLocalMetric?.Local_Metric_Lower_Bound ?? 0);
        setUpperBound(selectedLocalMetric?.Local_Metric_Upper_Bound ?? 10);
        setPrecision(selectedLocalMetric?.Local_Metric_Precision ?? 0);
        setMetricType(selectedLocalMetric?.Local_Metric_Type ?? 0);
    }, [selectedLocalMetric]);
    
    return (
        <div style={{marginLeft: "8px", flexDirection: "column"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a name for your metric: </div>
                <input name="metricName" type="text" value={metricName} onChange={(e) => {
                    setMetricName(e.currentTarget.value); 
                }} />
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a lower bound number for your rating service: </div>
                <input name="lowerBound" type="text" value={lowerBound} onChange={(e) => {
                    setLowerBound(e.currentTarget.value);
                }}  onBlur={(e) => {
                    setLowerBound(clampLowerBound(metricType, Number(e.currentTarget.value)));
                }} />
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose an upper bound number for your rating service: </div>
                <input name="upperBound" type="text" value={upperBound} onChange={(e) => {
                    setUpperBound(e.currentTarget.value);
                }} onBlur={(e) => {
                    setUpperBound(clampUpperBound(metricType, Number(e.currentTarget.value)));
                }} />
            </div>
            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Choose a <HoverInfo hoverText="How many fractional digits are stored">precision</HoverInfo> for your rating service: </div>
                <input disabled={metricType !== METRIC_TYPES.NUMERIC} type="text" value={precision} onChange={(e) => {
                    setPrecision(e.currentTarget.value);
                }}  onBlur={(e) => {
                    setPrecision(clampPrecision(metricType, Number(e.currentTarget.value)));
                }} />
                <input style={{display: "none"}} name="precision" type="text" value={precision} />
            </div>

            <div style={{margin: "2px 0 2px 0"}}>
                <div style={{marginRight: 2}}>Select what type of rating service you would like this to be: </div>
                <select name="metricType" value={metricType} onChange={(e) => {
                    let metricType = clampServiceType(Number(e.currentTarget.value));
                    if (metricType === METRIC_TYPES.INCDEC) {
                        setLowerBound(0);
                        setUpperBound(Infinity);
                        setPrecision(0);
                    } else if (metricType === METRIC_TYPES.STARS) {
                        setLowerBound(0);
                        setUpperBound(clamp(upperBound, 1, 20));
                        setPrecision(0);
                    }

                    setMetricType(metricType);
                }}>
                    <option value={METRIC_TYPES.NUMERIC}>Numeric</option>
                    <option value={METRIC_TYPES.INCDEC}>Inc/Dec</option>
                    <option value={METRIC_TYPES.STARS}>Stars</option>
                </select>
            </div>
        </div>
    );
}

export default LocalMetricModifications;