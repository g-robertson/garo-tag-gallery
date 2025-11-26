import { ReferenceableReact } from "../js/client-util.js";
import { ExistingState } from "../page/pages.js";

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */
/** @import {ExistingStateConstRef} from "../page/pages.js" */

/**
 * @param {{
 *     selectedLocalTagServiceConstRef?: ExistingStateConstRef<DBPermissionedLocalTagService>
 * }} param0 
 * @returns 
 */
const LocalTagServiceModifications = ({selectedLocalTagServiceConstRef}) => {
    const LocalTagServiceName = ReferenceableReact();
    selectedLocalTagServiceConstRef ??= ExistingState.stateRef(undefined);
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalTagServiceName.dom.value = selectedLocalTagServiceConstRef.get()?.Service_Name ?? "My tag service";
        };
        onSelectionChanged();

        let cleanup = () => {};
        cleanup = selectedLocalTagServiceConstRef.addOnUpdateCallback(onSelectionChanged, cleanup);
        return cleanup;
    }
    
    return (
        <div style={{marginLeft: "8px"}} onAdd={onAdd} >
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local tag service: </span>
                {LocalTagServiceName.react(<input name="serviceName" type="text" />)}
            </div>
        </div>
    );
}

export default LocalTagServiceModifications;