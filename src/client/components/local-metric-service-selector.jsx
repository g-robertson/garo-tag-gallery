import '../global.css';
import { executeFunctions } from '../js/client-util.js';
import { User } from '../js/user.js';
import { State } from '../page/pages.js';

/** @import {DBPermissionedLocalMetricService} from "../../db/tags.js" */
/** @import {State} from '../page/pages.js' */

/**
 * @param {{
 *  selectedLocalMetricServiceRef: State<DBPermissionedLocalMetricService>
 * }} param0
 * @returns
 */
const LocalMetricServiceSelector = ({selectedLocalMetricServiceRef}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];
    selectedLocalMetricServiceRef ??= new State(User.Global().localMetricServices()[0]);

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    }

    return (
        <div onAdd={onAdd} style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localMetricServiceID" value={selectedLocalMetricServiceRef?.Local_Metric_Service_ID} onChange={(e) => {
                    const selectedLocalMetricServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalMetricServiceRef.set(User.Global().localMetricServices().find(localMetricService => localMetricService.Local_Metric_Service_ID === selectedLocalMetricServiceID));
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