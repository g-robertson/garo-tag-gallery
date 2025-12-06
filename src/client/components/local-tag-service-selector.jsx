import '../global.css';
import { User } from '../js/user.js';
import { ExistingState } from '../page/pages.js';

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */
/** @import {ExistingStateRef} from '../page/pages.js' */

/**
 * @param {{
 *  selectedLocalTagServiceRef: ExistingStateRef<DBPermissionedLocalTagService>
 * }} param0
 * @returns
 */
const LocalTagServiceSelector = ({selectedLocalTagServiceRef}) => {
    selectedLocalTagServiceRef ??= ExistingState.stateRef(User.Global().localTagServices()[0]);

    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local tag service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTagServiceID" value={selectedLocalTagServiceRef.get()?.Local_Tag_Service_ID} onChange={(e) => {
                    const selectedLocalTagServiceRefID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalTagServiceRef.update(User.Global().localTagServices().find(localTagService => localTagService.Local_Tag_Service_ID === selectedLocalTagServiceRefID));
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