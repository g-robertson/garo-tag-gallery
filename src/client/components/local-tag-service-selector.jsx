import '../global.css';
import { User } from '../js/user.js';


/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */

/**
 * @param {{
 *  user: User
 *  onLocalTagServiceSelected?: (localTagService: DBPermissionedLocalTagService) => void
 *  defaultLocalTagService?: DBPermissionedLocalTagService
 * }} param0
 * @returns
 */
const LocalTagServiceSelector = ({user, onLocalTagServiceSelected, defaultLocalTagService}) => {
    defaultLocalTagService ??= user.localTagServices()[0];
    onLocalTagServiceSelected ??= () => {};

    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local tag service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTagServiceID" defaultValue={defaultLocalTagService?.Local_Tag_Service_ID} onChange={(e) => {
                    const selectedLocalTagService = Number(e.currentTarget.selectedOptions[0].value);
                    onLocalTagServiceSelected(
                        user.localTagServices().filter(localTagService => localTagService.Local_Tag_Service_ID === selectedLocalTagService)[0]
                    );
                }}>
                    {user.localTagServices().map(localTagService => (
                        <option value={localTagService.Local_Tag_Service_ID}>{localTagService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalTagServiceSelector;