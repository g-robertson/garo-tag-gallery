import '../global.css';
import LocalMetricServiceSelector from './local-metric-service-selector.jsx';
import { User } from '../js/user.js';
import { ExistingState } from '../page/pages.js';
import { ReferenceableReact } from '../js/client-util.js';

/** @import {DBLocalMetric, DBPermissionedLocalMetricService} from "../../db/metrics.js" */
/** @import {ExistingStateRef} from "../page/pages.js" */

/**
 * @param {{
 *  selectedLocalMetricRef?: ExistingStateRef<DBLocalMetric>
 *  selectedLocalMetricServiceRef?: ExistingStateRef<DBPermissionedLocalMetricService>
 * }} param0
 * @returns
 */
const LocalMetricSelector = ({selectedLocalMetricRef, selectedLocalMetricServiceRef}) => {
    const LocalMetricSelect = ReferenceableReact();

    selectedLocalMetricServiceRef ??= ExistingState.stateRef(User.Global().localMetricServices()[0]);
    selectedLocalMetricRef ??= ExistingState.stateRef(selectedLocalMetricServiceRef.get()?.Local_Metrics?.[0]);

    const onAdd = () => {
        const onLocalMetricServiceChanged = () => {
            const localMetricService = selectedLocalMetricServiceRef.get();
            LocalMetricSelect.dom.replaceChildren(...(localMetricService?.Local_Metrics ?? []).map(localMetric => (
                <option dom value={localMetric.Local_Metric_ID}>{localMetric.Local_Metric_Name}</option>
            )));
            
            const localMetricIDSelected = Number(LocalMetricSelect.dom.selectedOptions[0]?.value);
            if (localMetricService !== undefined) {
                selectedLocalMetricRef.update(localMetricService.Local_Metrics.find(localMetric => localMetric.Local_Metric_ID === localMetricIDSelected));
            }
        };
        onLocalMetricServiceChanged();

        let cleanup = () => {};
        cleanup = selectedLocalMetricServiceRef.addOnUpdateCallback(onLocalMetricServiceChanged, cleanup);
        return cleanup;
    };

    return (
        <>
            <LocalMetricServiceSelector selectedLocalMetricServiceRef={selectedLocalMetricServiceRef} />
            <div style={{marginLeft: "8px"}} onAdd={onAdd}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Select which local metric you wish to use: </span>
                    {LocalMetricSelect.react(<select name="localMetricID" style={{display: "inline-block"}} onChange={(e) => {
                        const localMetricIDSelected = Number(e.currentTarget.selectedOptions[0].value);
                        selectedLocalMetricRef.update(selectedLocalMetricServiceRef.get().Local_Metrics.find(localMetric => localMetric.Local_Metric_ID === localMetricIDSelected));
                    }} ></select>)}
                </div>
            </div>
        </>
    );
};

export default LocalMetricSelector;