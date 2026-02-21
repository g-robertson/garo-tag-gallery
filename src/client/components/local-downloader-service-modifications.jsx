import { executeFunctions, ReferenceableReact } from "../js/client-util.js";
import { ConstState } from "../js/state.js";

/** @import {DBPermissionedLocalDownloaderService} from "../../db/downloaders.js" */

/**
 * @param {{
 *     selectedLocalDownloaderServiceConstState?: ConstState<DBPermissionedLocalDownloaderService>
 * }} param0 
 * @returns 
 */
const LocalDownloaderServiceModifications = ({selectedLocalDownloaderServiceConstState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const LocalDownloaderServiceName = ReferenceableReact();
    selectedLocalDownloaderServiceConstState ??= ConstState.instance(undefined);
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalDownloaderServiceName.dom.value = selectedLocalDownloaderServiceConstState.get()?.Service_Name ?? "My downloader service";
        }
        onSelectionChanged();
        selectedLocalDownloaderServiceConstState.addOnUpdateCallback(onSelectionChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
    };
    
    return (
        <div style={{marginLeft: "8px"}} onAdd={onAdd}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local metric service: </span>
                {LocalDownloaderServiceName.react(<input name="serviceName" type="text" />)}
            </div>
        </div>
    );
}

export default LocalDownloaderServiceModifications;