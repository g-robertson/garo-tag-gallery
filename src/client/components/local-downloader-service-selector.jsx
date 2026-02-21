import '../global.css';
import { executeFunctions } from '../js/client-util.js';
import { User } from '../js/user.js';
import { State } from '../js/state.js';

/** @import {DBPermissionedLocalDownloaderService} from "../../db/downloaders.js" */
/** @import {State} from '../js/state.js' */

/**
 * @param {{
 *  selectedLocalDownloaderServiceState: State<DBPermissionedLocalDownloaderService>
 * }} param0
 * @returns
 */
const LocalDownloaderServiceSelector = ({selectedLocalDownloaderServiceState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];
    selectedLocalDownloaderServiceState ??= new State(User.Global().localDownloaderServices()[0]);

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    }

    return (
        <div onAdd={onAdd} style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Select which local metric service you wish to use: </span>
                <select style={{display: "inline-block"}} name="localDownloaderServiceID" value={selectedLocalDownloaderServiceState?.Local_Downloader_Service_ID} onChange={(e) => {
                    const selectedLocalDownloaderServiceID = Number(e.currentTarget.selectedOptions[0].value);
                    selectedLocalDownloaderServiceState.set(User.Global().localDownloaderServices().find(localDownloaderService => localDownloaderService.Local_Downloader_Service_ID === selectedLocalDownloaderServiceID));
                }}>
                    {User.Global().localDownloaderServices().map(localDownloaderService => (
                        <option value={localDownloaderService.Local_Downloader_Service_ID}>{localDownloaderService.Service_Name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocalDownloaderServiceSelector;