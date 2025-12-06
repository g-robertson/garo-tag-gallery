import '../global.css';
import LocalMetricServiceSelector from './local-metric-service-selector.jsx';
import { User } from '../js/user.js';
import { State } from '../page/pages.js';
import { executeFunctions, ReferenceableReact } from '../js/client-util.js';

/** @import {DBLocalMetric, DBPermissionedLocalMetricService} from "../../db/metrics.js" */
/** @import {State} from "../page/pages.js" */

/**
 * @param {{
 *  selectedLocalMetricRef?: State<DBLocalMetric>
 *  selectedLocalMetricServiceRef?: State<DBPermissionedLocalMetricService>
 * }} param0
 * @returns
 */
const LocalMetricSelector = ({selectedLocalMetricRef, selectedLocalMetricServiceRef}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const LocalMetricSelect = ReferenceableReact();

    selectedLocalMetricServiceRef ??= new State(User.Global().localMetricServices()[0]);
    selectedLocalMetricRef ??= new State(selectedLocalMetricServiceRef.get()?.Local_Metrics?.[0]);

    const onAdd = () => {
        const onLocalMetricServiceChanged = () => {
            const localMetricService = selectedLocalMetricServiceRef.get();
            LocalMetricSelect.dom.replaceChildren(...(localMetricService?.Local_Metrics ?? []).map(localMetric => (
                <option dom value={localMetric.Local_Metric_ID}>{localMetric.Local_Metric_Name}</option>
            )));
            
            const localMetricIDSelected = Number(LocalMetricSelect.dom.selectedOptions[0]?.value);
            if (localMetricService !== undefined) {
                selectedLocalMetricRef.set(localMetricService.Local_Metrics.find(localMetric => localMetric.Local_Metric_ID === localMetricIDSelected));
            }
        };
        onLocalMetricServiceChanged();
        selectedLocalMetricServiceRef.addOnUpdateCallback(onLocalMetricServiceChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
    };

    return (
        <>
            <LocalMetricServiceSelector selectedLocalMetricServiceRef={selectedLocalMetricServiceRef} />
            <div style={{marginLeft: "8px"}} onAdd={onAdd}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Select which local metric you wish to use: </span>
                    {LocalMetricSelect.react(<select name="localMetricID" style={{display: "inline-block"}} onChange={(e) => {
                        const localMetricIDSelected = Number(e.currentTarget.selectedOptions[0].value);
                        selectedLocalMetricRef.set(selectedLocalMetricServiceRef.get().Local_Metrics.find(localMetric => localMetric.Local_Metric_ID === localMetricIDSelected));
                    }} ></select>)}
                </div>
            </div>
        </>
    );
};

export default LocalMetricSelector;