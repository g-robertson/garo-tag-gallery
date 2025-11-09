import { useEffect } from 'react';
import '../global.css';

/** @import {DBPermissionedLocalMetricService} from "../../db/metrics.js" */
/** @import {Setters, States} from "../App.jsx" */

/**
 * @param {{
 *  states: States
 *  onMetricServiceSelected?: (localMetricService: DBPermissionedLocalMetricService) => void
 *  defaultLocalMetricService?: DBPermissionedLocalMetricService
 * }} param0
 * @returns
 */
const LocalMetricServiceSelector = ({states, onMetricServiceSelected, defaultLocalMetricService}) => {
    defaultLocalMetricService ??= states.user.localMetricServices()[0];
    onMetricServiceSelected ??= () => {};

    useEffect(() => {
        onMetricServiceSelected(defaultLocalMetricService);
    }, []);
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localMetricServiceID" defaultValue={defaultLocalMetricService?.Local_Metric_Service_ID} onChange={(e) => {
                    const selectedLocalMetricServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    onMetricServiceSelected(
                        states.user.localMetricServices().filter(localMetricService => localMetricService.Local_Metric_Service_ID === selectedLocalMetricServiceID)[0]
                    );
                }}>
                    {states.user.localMetricServices().map(localMetricService => (
                        <option value={localMetricService.Local_Metric_Service_ID}>{localMetricService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalMetricServiceSelector;