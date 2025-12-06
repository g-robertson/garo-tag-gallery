import '../global.css';
import { executeFunctions } from '../js/client-util.js';
import { User } from '../js/user.js';
import { State } from '../page/pages.js';

/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */
/** @import {State} from '../page/pages.js' */

/**
 * @param {{
 *  selectedLocalTaggableServiceRef: State<DBPermissionedLocalTaggableService>
 * }} param0
 * @returns
 */
const LocalTaggableServiceSelector = ({selectedLocalTaggableServiceRef}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];
    selectedLocalTaggableServiceRef ??= new State(User.Global().localTaggableServices()[0]);

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    }

    return (
        <div onAdd={onAdd} style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local taggable service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localTaggableServiceID" value={selectedLocalTaggableServiceRef.get()?.Local_Taggable_Service_ID} onChange={(e) => {
                    const selectedLocalTaggableServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalTaggableServiceRef.set(User.Global().localTaggableServices().find(localTaggableService => localTaggableService.Local_Taggable_Service_ID === selectedLocalTaggableServiceID));
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