import '../global.css';
import { User } from '../js/user.js';

/**
 * 
 * @param {{
 *  user: User
 *  onMetricServiceSelected: (localMetricService: DBPermissionedLocalMetricService) => void
 * }} param0
 * @returns s
 */
const LocalMetricServiceSelector = ({user, onMetricServiceSelected}) => {
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localMetricServiceID" onChange={(e) => {
                    onMetricServiceSelected(
                        user.localMetricServices().filter(localMetricService => localMetricService.Local_Metric_Service_ID === e.currentTarget.value)[0]
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