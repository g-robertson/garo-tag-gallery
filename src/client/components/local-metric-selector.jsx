import { useState } from 'react';
import '../global.css';
import { User } from '../js/user.js';
import LocalMetricServiceSelector from './local-metric-service-selector.jsx';

/**
 * 
 * @param {{
 *  user: User
 *  onLocalMetricSelected: 
 * }} param0
 * @returns s
 */
const LocalMetricSelector = ({user, onLocalMetricSelected}) => {
    const [localMetricService, setLocalMetricService] = useState(user.localMetricServices()[0]);

    return (
        <>
            <LocalMetricServiceSelector user={user} onMetricServiceSelected={(localMetricService) => {
                setLocalMetricService(localMetricService);
            }}/>
            <div style={{marginLeft: "8px"}}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Select which local metric you wish to use: </span>
                    {user.localMetricServices().length === 0
                    ? <select style={{display: "inline-block"}} name="localMetricID"></select>
                    : <select style={{display: "inline-block"}} name="localMetricID" onChange={(e) => {
                          onLocalMetricSelected(
                              localMetricService.Local_Metrics.filter(localMetricService => localMetricService.Local_Metric_ID === e.currentTarget.value)[0]
                          );
                      }}>
                          {localMetricService.Local_Metrics.map(localMetric => (
                              <option value={localMetric.Local_Metric_ID}>{localMetric.Local_Metric_Name}</option>
                          ))}
                      </select>
                    }
                </div>
            </div>
        </>
    );
};

export default LocalMetricSelector;