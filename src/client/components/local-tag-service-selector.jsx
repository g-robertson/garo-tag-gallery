import '../global.css';
import { User } from '../js/user.js';

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */

/**
 * 
 * @param {{
 *  user: User
 * }} param0
 * @returns s
 */
const LocalTagServiceSelector = ({user}) => {
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local tag service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTagServiceID">
                    {user.localTagServices().map(localTagService => (
                        <option value={localTagService.Local_Tag_Service_ID}>{localTagService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalTagServiceSelector;