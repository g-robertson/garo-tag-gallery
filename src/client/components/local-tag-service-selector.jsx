import '../global.css';
import { executeFunctions } from '../js/client-util.js';
import { User } from '../js/user.js';
import { State } from '../js/state.js';

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */
/** @import {State} from '../js/state.js' */

/**
 * @param {{
 *  selectedLocalTagServiceState: State<DBPermissionedLocalTagService>
 * }} param0
 * @returns
 */
const LocalTagServiceSelector = ({selectedLocalTagServiceState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    selectedLocalTagServiceState ??= new State(User.Global().localTagServices()[0]);

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    }

    return (
        <div onAdd={onAdd} style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local tag service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTagServiceID" value={selectedLocalTagServiceState.get()?.Local_Tag_Service_ID} onChange={(e) => {
                    const selectedLocalTagServiceStateID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalTagServiceState.set(User.Global().localTagServices().find(localTagService => localTagService.Local_Tag_Service_ID === selectedLocalTagServiceStateID));
                }}>
                    {User.Global().localTagServices().map(localTagService => (
                        <option value={localTagService.Local_Tag_Service_ID}>{localTagService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalTagServiceSelector;