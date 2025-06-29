import { useEffect, useState } from "react";

/** @import {DBPermissionedLocalMetricService} from "../../db/metrics.js" */

/**
 * @param {{
 *     selectedLocalMetricService?: DBPermissionedLocalMetricService
 * }} param0 
 * @returns 
 */
const LocalMetricServiceModifications = ({selectedLocalMetricService}) => {
    const [metricServiceName, setMetricServiceName] = useState(selectedLocalMetricService?.Service_Name ?? "My metric service");

    useEffect(() => {
        setMetricServiceName(selectedLocalMetricService?.Service_Name ?? "My metric service");
    }, [selectedLocalMetricService]);
    
    return (
        <div style={{marginLeft: "8px"}}>
            <div style={{margin: "2px 0 2px 0"}}>
                <span>Choose a name for your local metric service: </span>
                <input id="metricServiceName" name="serviceName" value={metricServiceName} type="text" onChange={e => {
                    setMetricServiceName(e.currentTarget.value);
                }} />
            </div>
        </div>
    );
}

export default LocalMetricServiceModifications;