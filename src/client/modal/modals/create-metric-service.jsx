import { useState } from 'react';
import '../../global.css';

/** 
 * @param {{
 *  popModal: () => void
 * }}
*/
const CreateMetricService = ({popModal}) => {
    const [firstLoad, setFirstLoad] = useState(true);

    return (
        <div>
            <form action="/api/post/create-metric-service" target="frame" method="POST">
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span>Choose a name for your metric service: </span>
                        <input name="serviceName" defaultValue="My metric service" type="text" />
                    </div>
                </div>
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
            </form>
            <iframe name="frame" style={{display: "none"}} onLoad={() => {
                if (firstLoad) {
                    setFirstLoad(false);
                } else {
                    popModal();
                }
            }}></iframe>
        </div>
    );
};

export default CreateMetricService;

export const MODAL_PROPERTIES = {
    modalName: "create-metric-service",
    displayName: "Create Metric Service"
};