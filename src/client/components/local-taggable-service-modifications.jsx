import { executeFunctions, ReferenceableReact } from "../js/client-util.js";
import { ConstState } from "../js/state.js";

/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */

/**
 * @param {{
 *     selectedLocalTaggableServiceConstState?: ConstState<DBPermissionedLocalTaggableService>
 * }} param0 
 * @returns 
 */
const LocalTaggableServiceModifications = ({selectedLocalTaggableServiceConstState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];
    
    const LocalTaggableServiceName = ReferenceableReact();
    selectedLocalTaggableServiceConstState ??= ConstState.instance(undefined);
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalTaggableServiceName.dom.value = selectedLocalTaggableServiceConstState.get()?.Service_Name ?? "My taggable service";
        };
        onSelectionChanged();
        selectedLocalTaggableServiceConstState.addOnUpdateCallback(onSelectionChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
    };
    
    return (
        <div style={{marginLeft: "8px"}} onAdd={onAdd}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local taggable service: </span>
                {LocalTaggableServiceName.react(<input name="serviceName" type="text" />)}
            </div>
        </div>
    );
}

export default LocalTaggableServiceModifications;