import '../../global.css';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import NumericInput from '../../components/numeric-input.jsx';
import { Modals } from '../../modal/modals.js';
import { User } from '../../js/user.js';
import { State } from '../../page/pages.js';
import { executeFunctions } from '../../js/client-util.js';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {DBLocalMetric} from "../../../db/metrics.js" */
/** @import {ClientComparator, ClientSearchTagHasMetricID, ClientSearchTagInLocalMetricServiceID, ClientSearchTagLocalMetricComparison} from "../../../api/post/search-taggables.js" */

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
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * } param0}
*/
export default function CreateMetricTag({ extraProperties, modalResolve }) {
    const selectedLocalMetricServiceRef = new State(User.Global().localMetricServices()[0]);
    const selectedLocalMetricRef = new State(selectedLocalMetricServiceRef.get()?.Local_Metrics?.[0]);
    const metricComparisonValueRef = new State(0);

    return {
        component: (
            <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
                <LocalMetricSelector
                    selectedLocalMetricServiceRef={selectedLocalMetricServiceRef}
                    selectedLocalMetricRef={selectedLocalMetricRef}
                />
                <div>
                    <input value="Has Metric In Metric Service" type="button" onClick={() => {
                        const localMetricService = selectedLocalMetricServiceRef.get();
                        /** @type {ClientSearchTagInLocalMetricServiceID} */
                        const localMetricServiceIDTag = {
                            type: "inLocalMetricServiceID",
                            localMetricServiceID: localMetricService.Local_Metric_Service_ID,
                            displayName: `system:has metric in metric service:${localMetricService.Service_Name}`
                        }
                        modalResolve(localMetricServiceIDTag);
                        Modals.Global().popModal();
                    }}/>
                    <input value="Has Metric" type="button" onClick={() => {
                        const localMetric = selectedLocalMetricRef.get();
                        /** @type {ClientSearchTagHasMetricID} */
                        const localMetricIDTag = {
                            type: "hasLocalMetricID",
                            Local_Metric_ID: localMetric.Local_Metric_ID,
                            displayName: `system:has metric from:${localMetric.Local_Metric_Name}`
                        }
                        modalResolve(localMetricIDTag);
                        Modals.Global().popModal();
                    }}/>
                </div>
                <div>
                    <input type="button" value="Metric is <" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricRef.get(), "<", metricComparisonValueRef.get()));
                        Modals.Global().popModal();
                    }} />
                    <input type="button" value="Metric is <=" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricRef.get(), "<=", metricComparisonValueRef.get()));
                        Modals.Global().popModal();
                    }} />
                    <input type="button" value="Metric is >" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricRef.get(), ">", metricComparisonValueRef.get()));
                        Modals.Global().popModal();
                    }} />
                    <input type="button" value="Metric is >=" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricRef.get(), ">=", metricComparisonValueRef.get()));
                        Modals.Global().popModal();
                    }} />
                    <NumericInput className="metric-tag-comparison" selectedNumberRef={metricComparisonValueRef} />
                </div>
            </div>
        ),
        displayName: "Create Metric Tag"
    };
};