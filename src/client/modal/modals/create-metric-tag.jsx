import '../../global.css';
import { useState } from 'react';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';

/** @import {User} from "../../js/user.js" */
/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientComparator, ClientSearchTagHasMetricID, ClientSearchTagInLocalMetricServiceID, ClientSearchTagLocalMetricComparison} from "../../../api/post/search-taggables.js" */
/** @import {DBLocalMetric, DBPermissionedLocalMetricService} from "../../../db/metrics.js" */

/**
 * 
 * @param {DBLocalMetric} localMetric
 * @param {ClientComparator} comparator 
 * @param {number} metricComparisonValue 
 */
function createLocalMetricComparison(localMetric, comparator, metricComparisonValue) {
    /** @type {ClientSearchTagLocalMetricComparison} */
    const localMetricComparison = {
        type: "localMetricComparison",
        Local_Metric_ID: localMetric.Local_Metric_ID,
        comparator,
        metricComparisonValue,
        displayName: `system:metric comparison:${localMetric.Local_Metric_Name} ${comparator} ${metricComparisonValue}`
    };
    return localMetricComparison;
}

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

    const [metricComparisonValue, setMetricComparisonValue] = useState(0);
    const [metricComparisonTextValue, setMetricComparisonTextValue] = useState("0");


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
                        Local_Metric_ID: localMetric.Local_Metric_ID,
                        displayName: `system:has metric from:${localMetric.Local_Metric_Name}`
                    }
                    modalOptions.resolve(localMetricIDTag);
                    popModal();
                }}/>
            </div>
            <div>
                <input type="button" value="Metric is <" onClick={() => {
                    modalOptions.resolve(createLocalMetricComparison(localMetric, "<", metricComparisonValue));
                    popModal();
                }} />
                <input type="button" value="Metric is <=" onClick={() => {
                    modalOptions.resolve(createLocalMetricComparison(localMetric, "<=", metricComparisonValue));
                    popModal();
                }} />
                <input type="button" value="Metric is >" onClick={() => {
                    modalOptions.resolve(createLocalMetricComparison(localMetric, ">", metricComparisonValue));
                    popModal();
                }} />
                <input type="button" value="Metric is >=" onClick={() => {
                    modalOptions.resolve(createLocalMetricComparison(localMetric, ">=", metricComparisonValue));
                    popModal();
                }} />
                <input type="text" value={metricComparisonTextValue} onChange={e => {
                    setMetricComparisonTextValue(e.currentTarget.value);
                }} onBlur={e => {
                    const newMetricComparisonValue = Number(metricComparisonTextValue);
                    if (Number.isFinite(newMetricComparisonValue)) {
                        setMetricComparisonValue(newMetricComparisonValue);
                        setMetricComparisonTextValue(newMetricComparisonValue.toString())
                    } else {
                        setMetricComparisonTextValue(metricComparisonValue.toString())
                    }
                }} />
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