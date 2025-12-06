import '../global.css';
import { User } from '../js/user.js';
import { ExistingState } from '../page/pages.js';

/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */
/** @import {ExistingStateRef} from '../page/pages.js' */

/**
 * @param {{
 *  selectedLocalTaggableServiceRef: ExistingStateRef<DBPermissionedLocalTaggableService>
 * }} param0
 * @returns
 */
const LocalTaggableServiceSelector = ({selectedLocalTaggableServiceRef}) => {
    selectedLocalTaggableServiceRef ??= ExistingState.stateRef(User.Global().localTaggableServices()[0]);

    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local taggable service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTaggableServiceID" value={selectedLocalTaggableServiceRef.get()?.Local_Taggable_Service_ID} onChange={(e) => {
                    const selectedLocalTaggableServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalTaggableServiceRef.update(User.Global().localTaggableServices().find(localTaggableService => localTaggableService.Local_Taggable_Service_ID === selectedLocalTaggableServiceID));
                }}>
                    {User.Global().localTaggableServices().map(localTaggableService => (
                        <option value={localTaggableService.Local_Taggable_Service_ID}>{localTaggableService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalTaggableServiceSelector;