import '../../global.css';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import NumericInput from '../../components/numeric-input.jsx';
import { Modals } from '../../modal/modals.js';
import { User } from '../../js/user.js';
import { State } from '../../page/pages.js';

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

export default function CreateMetricTag() {
    let modalResolve;
    /** @type {Promise<T>} */
    const promiseValue = new Promise(resolve => { modalResolve = resolve; });

    const selectedLocalMetricServiceState = new State(User.Global().localMetricServices()[0]);
    const selectedLocalMetricState = new State(selectedLocalMetricServiceState.get()?.Local_Metrics?.[0]);
    const metricComparisonValueState = new State(0);

    return {
        component: (
            <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
                <LocalMetricSelector
                    selectedLocalMetricServiceState={selectedLocalMetricServiceState}
                    selectedLocalMetricState={selectedLocalMetricState}
                />
                <div>
                    <input value="Has Metric In Metric Service" type="button" onClick={() => {
                        const localMetricService = selectedLocalMetricServiceState.get();
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
                        const localMetric = selectedLocalMetricState.get();
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
                        modalResolve(createLocalMetricComparison(selectedLocalMetricState.get(), "<", metricComparisonValueState.get()));
                        Modals.Global().popModal();
                    }} />
                    <input type="button" value="Metric is <=" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricState.get(), "<=", metricComparisonValueState.get()));
                        Modals.Global().popModal();
                    }} />
                    <input type="button" value="Metric is >" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricState.get(), ">", metricComparisonValueState.get()));
                        Modals.Global().popModal();
                    }} />
                    <input type="button" value="Metric is >=" onClick={() => {
                        modalResolve(createLocalMetricComparison(selectedLocalMetricState.get(), ">=", metricComparisonValueState.get()));
                        Modals.Global().popModal();
                    }} />
                    <NumericInput className="metric-tag-comparison" selectedNumberState={metricComparisonValueState} />
                </div>
            </div>
        ),
        displayName: "Create Metric Tag",
        promiseValue
    };
};