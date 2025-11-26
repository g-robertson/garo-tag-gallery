import { ReferenceableReact } from "../js/client-util.js";
import { ExistingState } from "../page/pages.js";

/** @import {DBPermissionedLocalMetricService} from "../../db/metrics.js" */
/** @import {ExistingStateConstRef} from "../page/pages.js" */

/**
 * @param {{
 *     selectedLocalMetricServiceConstRef?: ExistingStateConstRef<DBPermissionedLocalMetricService>
 * }} param0 
 * @returns 
 */
const LocalMetricServiceModifications = ({selectedLocalMetricServiceConstRef}) => {
    const LocalMetricServiceName = ReferenceableReact();
    selectedLocalMetricServiceConstRef ??= ExistingState.stateRef(undefined);
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalMetricServiceName.dom.value = selectedLocalMetricServiceConstRef.get()?.Service_Name ?? "My metric service";
        }
        onSelectionChanged();

        let cleanup = () => {};
        cleanup = selectedLocalMetricServiceConstRef.addOnUpdateCallback(onSelectionChanged, cleanup);
        return cleanup;
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