import { useEffect } from 'react';
import '../global.css';
import { User } from '../js/user.js';

/** @import {DBPermissionedLocalMetricService} from "../../db/metrics.js" */

/**
 * @param {{
 *  user: User
 *  onMetricServiceSelected?: (localMetricService: DBPermissionedLocalMetricService) => void
 *  defaultLocalMetricService?: DBPermissionedLocalMetricService
 * }} param0
 * @returns s
 */
const LocalMetricServiceSelector = ({user, onMetricServiceSelected, defaultLocalMetricService}) => {
    defaultLocalMetricService ??= user.localMetricServices()[0];
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
                        user.localMetricServices().filter(localMetricService => localMetricService.Local_Metric_Service_ID === selectedLocalMetricServiceID)[0]
                    );
                }}>
                    {user.localMetricServices().map(localMetricService => (
                        <option value={localMetricService.Local_Metric_Service_ID}>{localMetricService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalMetricServiceSelector;