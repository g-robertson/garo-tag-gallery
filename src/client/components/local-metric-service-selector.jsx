import '../global.css';
import { User } from '../js/user.js';
import { ExistingState } from '../page/pages.js';

/** @import {DBPermissionedLocalMetricService} from "../../db/tags.js" */
/** @import {ExistingStateRef} from '../page/pages.js' */

/**
 * @param {{
 *  selectedLocalMetricServiceRef: ExistingStateRef<DBPermissionedLocalMetricService>
 * }} param0
 * @returns
 */
const LocalMetricServiceSelector = ({selectedLocalMetricServiceRef}) => {
    selectedLocalMetricServiceRef ??= ExistingState.stateRef(User.Global().localMetricServices()[0]);

    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localMetricServiceID" defaultValue={selectedLocalMetricServiceRef?.Local_Metric_Service_ID} onChange={(e) => {
                    const selectedLocalMetricServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalMetricServiceRef.update(User.Global().localMetricServices().find(localMetricService => localMetricService.Local_Metric_Service_ID === selectedLocalMetricServiceID));
                }}>
                    {User.Global().localMetricServices().map(localMetricService => (
                        <option value={localMetricService.Local_Metric_Service_ID}>{localMetricService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalMetricServiceSelector;