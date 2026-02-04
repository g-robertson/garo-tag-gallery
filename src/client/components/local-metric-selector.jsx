import '../global.css';
import LocalMetricServiceSelector from './local-metric-service-selector.jsx';
import { User } from '../js/user.js';
import { State } from '../js/state.js';
import { executeFunctions, ReferenceableReact } from '../js/client-util.js';

/** @import {DBLocalMetric, DBPermissionedLocalMetricService} from "../../db/metrics.js" */
/** @import {State} from "../js/state.js" */

/**
 * @param {{
 *  selectedLocalMetricState?: State<DBLocalMetric>
 *  selectedLocalMetricServiceState?: State<DBPermissionedLocalMetricService>
 * }} param0
 * @returns
 */
const LocalMetricSelector = ({selectedLocalMetricState, selectedLocalMetricServiceState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const LocalMetricSelect = ReferenceableReact();

    selectedLocalMetricServiceState ??= new State(User.Global().localMetricServices()[0]);
    selectedLocalMetricState ??= new State(selectedLocalMetricServiceState.get()?.Local_Metrics?.[0]);

    const onAdd = () => {
        const onLocalMetricServiceChanged = () => {
            const localMetricService = selectedLocalMetricServiceState.get();
            LocalMetricSelect.dom.replaceChildren(...(localMetricService?.Local_Metrics ?? []).map(localMetric => (
                <option dom value={localMetric.Local_Metric_ID}>{localMetric.Local_Metric_Name}</option>
            )));
            
            const localMetricIDSelected = Number(LocalMetricSelect.dom.selectedOptions[0]?.value);
            if (localMetricService !== undefined) {
                selectedLocalMetricState.set(localMetricService.Local_Metrics.find(localMetric => localMetric.Local_Metric_ID === localMetricIDSelected));
            }
        };
        onLocalMetricServiceChanged();
        selectedLocalMetricServiceState.addOnUpdateCallback(onLocalMetricServiceChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
    };

    return (
        <>
            <LocalMetricServiceSelector selectedLocalMetricServiceState={selectedLocalMetricServiceState} />
            <div style={{marginLeft: "8px"}} onAdd={onAdd}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Select which local metric you wish to use: </span>
                    {LocalMetricSelect.react(<select name="localMetricID" style={{display: "inline-block"}} onChange={(e) => {
                        const localMetricIDSelected = Number(e.currentTarget.selectedOptions[0].value);
                        selectedLocalMetricState.set(selectedLocalMetricServiceState.get().Local_Metrics.find(localMetric => localMetric.Local_Metric_ID === localMetricIDSelected));
                    }} ></select>)}
                </div>
            </div>
        </>
    );
};

export default LocalMetricSelector;