import '../global.css';
import { executeFunctions } from '../js/client-util.js';
import { User } from '../js/user.js';
import { State } from '../js/state.js';

/** @import {DBPermissionedLocalMetricService} from "../../db/tags.js" */
/** @import {State} from '../js/state.js' */

/**
 * @param {{
 *  selectedLocalMetricServiceState: State<DBPermissionedLocalMetricService>
 * }} param0
 * @returns
 */
const LocalMetricServiceSelector = ({selectedLocalMetricServiceState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];
    selectedLocalMetricServiceState ??= new State(User.Global().localMetricServices()[0]);

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    }

    return (
        <div onAdd={onAdd} style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localMetricServiceID" value={selectedLocalMetricServiceState?.Local_Metric_Service_ID} onChange={(e) => {
                    const selectedLocalMetricServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalMetricServiceState.set(User.Global().localMetricServices().find(localMetricService => localMetricService.Local_Metric_Service_ID === selectedLocalMetricServiceID));
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