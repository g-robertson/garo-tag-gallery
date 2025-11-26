import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricServiceModifications from '../../components/local-metric-service-modifications.jsx';
import LocalMetricServiceSelector from '../../components/local-metric-service-selector.jsx';
import deleteLocalMetricService from '../../../api/client-get/delete-local-metric-service.js';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import { ReferenceableReact } from '../../js/client-util.js';
import { ExistingState } from '../../page/pages.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function UpdateLocalMetricService({ extraProperties, modalResolve }) {
    const ModifySelectedMetricService = ReferenceableReact();
    const DeleteSelectedMetricService = ReferenceableReact();
    const selectedLocalMetricServiceRef = ExistingState.stateRef(User.Global().localMetricServices()[0]);

    const onAdd = () => {
        const onLocalMetricServiceSelected = () => {
            const inputsDisabled = selectedLocalMetricServiceRef.get() === undefined;
            ModifySelectedMetricService.dom.disabled = inputsDisabled;
            DeleteSelectedMetricService.dom.disabled = inputsDisabled;
        };
        onLocalMetricServiceSelected();

        let cleanup = () => {};
        cleanup = selectedLocalMetricServiceRef.addOnUpdateCallback(onLocalMetricServiceSelected, cleanup);
        return cleanup;
    };


    return {
        component: (
            <div style={{flexDirection: "column"}} onAdd={onAdd}>
                <form action="/api/post/update-local-metric-service" target="frame" method="POST">
                    <LocalMetricServiceSelector selectedLocalMetricServiceRef={selectedLocalMetricServiceRef} />
                    <LocalMetricServiceModifications selectedLocalMetricServiceConstRef={selectedLocalMetricServiceRef} />
                    <div style={{marginLeft: "8px"}}>
                        {ModifySelectedMetricService.react(<input type="submit" value="Modify selected metric service" />)}
                    </div>
                </form>
                <div style={{marginLeft: "8px"}}>
                    {DeleteSelectedMetricService.react(<input type="button" value="Delete selected metric service" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to delete this metric service?\nWARNING: This will remove every Metric that exists under this metric service");
                        if (confirm) {
                            (async () => {
                                await deleteLocalMetricService(selectedLocalMetricServiceRef.get().Local_Metric_Service_ID);
                                User.refreshGlobal();
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
        displayName: "Update Local Metric Service"
    };
};