import { useState } from 'react';
import '../../global.css';
import { User } from '../js/user.js';
import { clamp } from '../../js/client-util.js';
import LocalMetricServiceSelector from '../../components/local-metric-service-selector.jsx';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';

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

const METRIC_TYPES = {
    NUMERIC: 0,
    INCDEC: 1,
    STARS: 2
};

/** 
 * @param {{
 *  user: User
 *  popModal: () => void
 * }}
*/
const CreateMetric = ({user, popModal}) => {
    const [lowerBound, setLowerBound] = useState(0);
    const [upperBound, setUpperBound] = useState(10);
    const [precision, setPrecision] = useState(0);
    const [metricType, setServiceType] = useState(0);

    return (
        <div>
            <form action="/api/post/create-metric" target="frame" method="POST">
                <LocalMetricServiceSelector user={user} />
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span style={{marginRight: 2}}>Choose a name for your metric: </span>
                        <input name="metricName" type="text" defaultValue="My metric" />
                    </div>
                </div>
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span style={{marginRight: 2}}>Choose a lower bound number for your rating service: </span>
                        <input name="lowerBound" type="text" value={lowerBound} onChange={(e) => {
                            setLowerBound(e.currentTarget.value);
                        }}  onBlur={(e) => {
                            setLowerBound(clampLowerBound(metricType, Number(e.currentTarget.value)));
                        }} />
                    </div>
                </div>
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span>Choose an upper bound number for your rating service: </span>
                        <input name="upperBound" type="text" value={upperBound} onChange={(e) => {
                            setUpperBound(e.currentTarget.value);
                        }} onBlur={(e) => {
                            setUpperBound(clampUpperBound(metricType, Number(e.currentTarget.value)));
                        }} />
                    </div>
                </div>
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span style={{marginRight: 2}}>Choose a <span title="how many fractional digits are stored">precision<sub><sub>?</sub></sub></span> for your rating service: </span>
                        <input disabled={metricType !== METRIC_TYPES.NUMERIC} name="precision" type="text" value={precision} onChange={(e) => {
                            setPrecision(e.currentTarget.value);
                        }}  onBlur={(e) => {
                            setPrecision(clampPrecision(metricType, Number(e.currentTarget.value)));
                        }} />
                        <input style={{display: "none"}} name="precision" type="text" value={precision} />
                    </div>
                </div> 

                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span style={{marginRight: 2}}>Select what type of rating service you would like this to be: </span>
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

                            setServiceType(metricType);
                        }}>
                            <option value={METRIC_TYPES.NUMERIC}>Numeric</option>
                            <option value={METRIC_TYPES.INCDEC}>Inc/Dec</option>
                            <option value={METRIC_TYPES.STARS}>Stars</option>
                        </select>
                    </div>
                </div>
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
                <OnFormSubmit onFormSubmit={popModal}/>
            </form>
        </div>
    );
};

export default CreateMetric;

export const MODAL_PROPERTIES = {
    modalName: "create-metric",
    displayName: "Create Metric"
};