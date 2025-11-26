import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricModifications from '../../components/local-metric-modifications.jsx';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import deleteLocalMetric from '../../../api/client-get/delete-local-metric.js';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import { ExistingState } from '../../page/pages.js';
import { ReferenceableReact } from '../../js/client-util.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function UpdateLocalMetric({ extraProperties, modalResolve }) {
    const ModifySelectedMetric = ReferenceableReact();
    const DeleteSelectedMetric = ReferenceableReact();

    const selectedLocalMetricServiceRef = ExistingState.stateRef(User.Global().localMetricServices()[0]);
    const selectedLocalMetricRef = ExistingState.stateRef(selectedLocalMetricServiceRef.get()?.Local_Metrics?.[0]);

    const onAdd = () => {
        const onLocalMetricSelected = () => {
            const inputsDisabled = selectedLocalMetricRef.get() === undefined;
            ModifySelectedMetric.dom.disabled = inputsDisabled;
            DeleteSelectedMetric.dom.disabled = inputsDisabled;
        };
        onLocalMetricSelected();

        let cleanup = () => {};
        cleanup = selectedLocalMetricRef.addOnUpdateCallback(onLocalMetricSelected, cleanup);
        return cleanup;
    };

    return {
        component: (
            <div style={{flexDirection: "column"}} onAdd={onAdd}>
                <form action="/api/post/update-local-metric" target="frame" method="POST">
                    <LocalMetricSelector selectedLocalMetricServiceRef={selectedLocalMetricServiceRef} selectedLocalMetricRef={selectedLocalMetricRef}/>
                    <LocalMetricModifications selectedLocalMetricConstRef={selectedLocalMetricRef} />
                    <div style={{marginLeft: "8px"}}>
                        {ModifySelectedMetric.react(<input type="submit" value="Modify selected metric" />)}
                    </div>
                </form>
                <div style={{marginLeft: "8px"}}>
                    {DeleteSelectedMetric.react(<input type="button" value="Delete selected metric" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to delete this metric?\nWARNING: This will remove every application of this metric that you have placed on taggables");
                        if (confirm) {
                            (async () => {
                                await deleteLocalMetric(selectedLocalMetricRef.get().Local_Metric_ID);
                                await User.refreshGlobal();
                                Modals.Global().popModal();
                            })();
                        }
                    }} />)}
                </div>
                <OnFormSubmit onFormSubmit={async () => {
                    User.refreshGlobal();
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Update Local Metric"
    };
};