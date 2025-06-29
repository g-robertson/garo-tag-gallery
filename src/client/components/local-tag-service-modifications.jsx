import { useEffect, useState } from "react";

/** @import {DBPermissionedLocalTagService} from "../../db/tags.js" */

/**
 * @param {{
 *     selectedLocalTagService?: DBPermissionedLocalTagService
 * }} param0 
 * @returns 
 */
const LocalTagServiceModifications = ({selectedLocalTagService}) => {
    const [localTagServiceName, setLocalTagServiceName] = useState(selectedLocalTagService?.Service_Name ?? "My tag service");

    useEffect(() => {
        setLocalTagServiceName(selectedLocalTagService?.Service_Name ?? "My tag service");
    }, [selectedLocalTagService]);
    
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local tag service: </span>
                <input id="localTagServiceName" name="serviceName" value={localTagServiceName} type="text" onChange={e => {
                    setLocalTagServiceName(e.currentTarget.value);
                }} />
            </div>
        </div>
    );
}

export default LocalTagServiceModifications;