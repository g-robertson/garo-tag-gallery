import '../../global.css';
import { useState } from 'react';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';

/** @import {User} from "../../js/user.js" */
/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientSearchTagHasMetricID, ClientSearchTagInLocalMetricServiceID} from "../../../api/post/search-taggables.js" */
/** @import {DBLocalMetric, DBPermissionedLocalMetricService} from "../../../db/metrics.js" */

/** 
 * @param {{
 *  user: User
 *  modalOptions: ModalOptions
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * } param0}
*/
const CreateMetricTag = ({user, modalOptions, pushModal, popModal}) => {
    /** @type {[DBPermissionedLocalMetricService, (localMetricService: DBPermissionedLocalMetricService) => void]} */
    const [localMetricService, setLocalMetricService] = useState(null);
    /** @type {[DBLocalMetric, (localMetric: DBLocalMetric) => void]} */
    const [localMetric, setLocalMetric] = useState(null);
    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            <LocalMetricSelector user={user} onLocalMetricServiceSelected={(localMetricService => {
                setLocalMetricService(localMetricService);
            })} onLocalMetricSelected={(localMetric => {
                setLocalMetric(localMetric);
            })} />
            <div>
                <input value="Has Metric In Metric Service" type="button" onClick={() => {
                    /** @type {ClientSearchTagInLocalMetricServiceID} */
                    const localMetricServiceIDTag = {
                        type: "inLocalMetricServiceID",
                        localMetricServiceID: localMetricService.Local_Metric_Service_ID,
                        displayName: `system:has metric in metric service:${localMetricService.Service_Name}`
                    }
                    modalOptions.resolve(localMetricServiceIDTag);
                    popModal();
                }}/>
                <input value="Has Metric" type="button" onClick={() => {
                    /** @type {ClientSearchTagHasMetricID} */
                    const localMetricIDTag = {
                        type: "hasLocalMetricID",
                        localMetricID: localMetric.Local_Metric_ID,
                        displayName: `system:has metric from:${localMetric.Local_Metric_Name}`
                    }
                    modalOptions.resolve(localMetricIDTag);
                    popModal();
                }}/>
            </div>
        </div>
    );
};

export default CreateMetricTag;

export const MODAL_PROPERTIES = {
    modalName: "create-metric-tag",
    displayName: "Create Metric Tag"
};
export const CREATE_METRIC_TAG_MODAL_PROPERTIES = MODAL_PROPERTIES;