import { useEffect, useState } from 'react';
import '../global.css';
import { User } from '../js/user.js';
import LocalMetricServiceSelector from './local-metric-service-selector.jsx';

/** @import {DBLocalMetric, DBPermissionedLocalMetricService} from "../../db/metrics.js" */

/**
 * @param {{
 *  user: User
 *  onLocalMetricSelected: (localMetric: DBLocalMetric) => void
 *  onLocalMetricServiceSelected: (localMetricService: DBPermissionedLocalMetricService) => void
 * }} param0
 * @returns s
 */
const LocalMetricSelector = ({user, onLocalMetricSelected, onLocalMetricServiceSelected}) => {
    onLocalMetricServiceSelected ??= () => {};
    onLocalMetricSelected ??= () => {};
    const defaultLocalMetricService = user.localMetricServices()[0];
    const [localMetricService, setLocalMetricService] = useState(defaultLocalMetricService);
    const defaultLocalMetric = localMetricService?.Local_Metrics?.[0];

    useEffect(() => {
        onLocalMetricSelected(defaultLocalMetric);
    }, [])
    useEffect(() => {
        onLocalMetricServiceSelected(localMetricService);
    }, [localMetricService]);

    return (
        <>
            <LocalMetricServiceSelector user={user} defaultLocalMetricService={defaultLocalMetricService} onMetricServiceSelected={(localMetricService) => {
                setLocalMetricService(localMetricService);
            }}/>
            <div style={{marginLeft: "8px"}}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Select which local metric you wish to use: </span>
                    {user.localMetricServices().length === 0
                    ? <select style={{display: "inline-block"}} name="localMetricID"></select>
                    : <select defaultValue={defaultLocalMetric?.Local_Metric_ID} style={{display: "inline-block"}} name="localMetricID" onChange={(e) => {
                          const localMetricIDSelected = Number(e.currentTarget.selectedOptions[0].value);
                          onLocalMetricSelected(
                              localMetricService.Local_Metrics.filter(localMetricService => localMetricService.Local_Metric_ID === localMetricIDSelected)[0]
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