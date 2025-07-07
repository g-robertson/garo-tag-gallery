import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalMetricServiceModifications from '../../components/local-metric-service-modifications.jsx';
import LocalMetricServiceSelector from '../../components/local-metric-service-selector.jsx';
import { useState } from 'react';
import deleteLocalMetricService from '../../../api/client-get/delete-local-metric-service.js';

/** @import {User} from "../../js/user.js" */

/** 
 * @param {{
 *  user: User
 *  setUser: (user: User) => void
 *  popModal: () => void
 * }}
*/
const UpdateLocalMetricService = ({user, setUser, popModal}) => {
    const defaultLocalMetricService = user.localMetricServices()[0];
    const [selectedLocalMetricService, setSelectedLocalMetricService] = useState(defaultLocalMetricService);

    return (
        <div style={{flexDirection: "column"}}>
            <form action="/api/post/update-local-metric-service" target="frame" method="POST">
                <LocalMetricServiceSelector user={user} defaultLocalMetricService={defaultLocalMetricService} onMetricServiceSelected={metricService => {
                    setSelectedLocalMetricService(metricService);
                }} />
                <LocalMetricServiceModifications selectedLocalMetricService={selectedLocalMetricService} />
                <div style={{marginLeft: "8px"}}>
                    <input disabled={selectedLocalMetricService === undefined} type="submit" value="Modify selected metric service" />
                </div>
            </form>
            <div style={{marginLeft: "8px"}}>
                <input disabled={selectedLocalMetricService === undefined} type="button" value="Delete selected metric service" onClick={() => {
                    const confirm = window.confirm("Are you sure you want to delete this metric service?\nWARNING: This will remove every Metric that exists under this metric service");
                    if (confirm) {
                        (async () => {
                            await deleteLocalMetricService(selectedLocalMetricService.Local_Metric_Service_ID);
                            setUser(await getMe());
                            popModal();
                        })();
                    }
                }} />
            </div>
            <OnFormSubmit onFormSubmit={async () => {
                setUser(await getMe());
                popModal();
            }} />
        </div>
    );
};

export default UpdateLocalMetricService;

export const MODAL_PROPERTIES = {
    modalName: "update-local-metric-service",
    displayName: "Update Local Metric Service"
};
export const UPDATE_LOCAL_METRIC_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;