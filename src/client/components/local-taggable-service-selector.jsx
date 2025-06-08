import '../global.css';
import { User } from '../js/user.js';

/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */

/**
 * 
 * @param {{
 *  user: User
 * }} param0
 * @returns 
 */
const LocalTaggableServiceSelector = ({user}) => {
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local taggable service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTaggableServiceID">
                    {user.localTaggableServices().map(localTaggableService => (
                        <option value={localTaggableService.Local_Taggable_Service_ID}>{localTaggableService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalTaggableServiceSelector;