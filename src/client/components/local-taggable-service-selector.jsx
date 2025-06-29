import '../global.css';
import { User } from '../js/user.js';


/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */

/**
 * @param {{
 *  user: User
 *  onLocalTaggableServiceSelected?: (localTaggableService: DBPermissionedLocalTagService) => void
 *  defaultLocalTaggableService?: DBPermissionedLocalTagService
 * }} param0
 * @returns
 */
const LocalTaggableServiceSelector = ({user, onLocalTaggableServiceSelected, defaultLocalTaggableService}) => {
    defaultLocalTaggableService ??= user.localTaggableServices()[0];
    onLocalTaggableServiceSelected ??= () => {};

    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local taggable service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTaggableServiceID" defaultValue={defaultLocalTaggableService?.Local_Taggable_Service_ID} onChange={(e) => {
                    const selectedLocalTaggableService = Number(e.currentTarget.selectedOptions[0].value);
                    onLocalTaggableServiceSelected(
                        user.localTaggableServices().filter(localTaggableService => localTaggableService.Local_Taggable_Service_ID === selectedLocalTaggableService)[0]
                    );
                }}>
                    {user.localTaggableServices().map(localTaggableService => (
                        <option value={localTaggableService.Local_Taggable_Service_ID}>{localTaggableService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalTaggableServiceSelector;