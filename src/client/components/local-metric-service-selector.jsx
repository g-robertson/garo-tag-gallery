import '../global.css';
import { User } from '../js/user.js';

/**
 * 
 * @param {{
 *  user: User
 * }} param0
 * @returns s
 */
const LocalMetricServiceSelector = ({user}) => {
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localMetricServiceID">
                    {user.localMetricServices().map(localMetricService => (
                        <option value={localMetricService.Local_Metric_Service_ID}>{localMetricService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalMetricServiceSelector;