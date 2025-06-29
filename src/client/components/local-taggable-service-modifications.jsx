import { useEffect, useState } from "react";

/** @import {DBPermissionedLocalTaggableService} from "../../db/taggables.js" */

/**
 * @param {{
 *     selectedLocalTaggableService?: DBPermissionedLocalTaggableService
 * }} param0 
 * @returns 
 */
const LocalTaggableServiceModifications = ({selectedLocalTaggableService}) => {
    const [localTaggableServiceName, setLocalTaggableServiceName] = useState(selectedLocalTaggableService?.Service_Name ?? "My taggable service");

    useEffect(() => {
        setLocalTaggableServiceName(selectedLocalTaggableService?.Service_Name ?? "My taggable service");
    }, [selectedLocalTaggableService]);
    
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local taggable service: </span>
                <input id="localTaggableServiceName" name="serviceName" value={localTaggableServiceName} type="text" onChange={e => {
                    setLocalTaggableServiceName(e.currentTarget.value);
                }} />
            </div>
        </div>
    );
}

export default LocalTaggableServiceModifications;