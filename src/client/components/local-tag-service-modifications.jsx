import { executeFunctions, ReferenceableReact } from "../js/client-util.js";
import { ConstState } from "../page/pages.js";

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */

/**
 * @param {{
 *     selectedLocalTagServiceConstState?: ConstState<DBPermissionedLocalTagService>
 * }} param0 
 * @returns 
 */
const LocalTagServiceModifications = ({selectedLocalTagServiceConstState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const LocalTagServiceName = ReferenceableReact();
    selectedLocalTagServiceConstState ??= ConstState.instance(undefined);
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalTagServiceName.dom.value = selectedLocalTagServiceConstState.get()?.Service_Name ?? "My tag service";
        };
        onSelectionChanged();
        selectedLocalTagServiceConstState.addOnUpdateCallback(onSelectionChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
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