import { executeFunctions, ReferenceableReact } from "../js/client-util.js";
import { ConstState } from "../js/state.js";

/** @import {DBPermissionedLocalMetricService} from "../../db/metrics.js" */

/**
 * @param {{
 *     selectedLocalMetricServiceConstState?: ConstState<DBPermissionedLocalMetricService>
 * }} param0 
 * @returns 
 */
const LocalMetricServiceModifications = ({selectedLocalMetricServiceConstState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const LocalMetricServiceName = ReferenceableReact();
    selectedLocalMetricServiceConstState ??= ConstState.instance(undefined);
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalMetricServiceName.dom.value = selectedLocalMetricServiceConstState.get()?.Service_Name ?? "My metric service";
        }
        onSelectionChanged();
        selectedLocalMetricServiceConstState.addOnUpdateCallback(onSelectionChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
    };
    
    return (
        <div style={{marginLeft: "8px"}} onAdd={onAdd}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local metric service: </span>
                {LocalMetricServiceName.react(<input name="serviceName" type="text" />)}
            </div>
        </div>
    );
}

export default LocalMetricServiceModifications;