import { ReferenceableReact } from "../js/client-util.js";

/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */
/** @import {ExistingStateConstRef} from "../page/pages.js" */

/**
 * @param {{
 *     selectedLocalTaggableServiceConstRef?: ExistingStateConstRef<DBPermissionedLocalTaggableService>
 * }} param0 
 * @returns 
 */
const LocalTaggableServiceModifications = ({selectedLocalTaggableServiceConstRef}) => {
    const LocalTaggableServiceName = ReferenceableReact();
    
    const onAdd = () => {
        const onSelectionChanged = () => {
            LocalTaggableServiceName.dom.value = selectedLocalTaggableServiceConstRef.get()?.Service_Name ?? "My taggable service";
        };
        onSelectionChanged();

        let cleanup = () => {};
        cleanup = selectedLocalTaggableServiceConstRef.addOnUpdateCallback(onSelectionChanged, cleanup);
        return cleanup;
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