import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricModifications from '../../components/local-metric-modifications.jsx';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import deleteLocalMetric from '../../../api/client-get/delete-local-metric.js';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import { State } from '../../page/pages.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';

export default function UpdateLocalMetric() {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const ModifySelectedMetric = ReferenceableReact();
    const DeleteSelectedMetric = ReferenceableReact();

    const selectedLocalMetricServiceState = new State(User.Global().localMetricServices()[0]);
    const selectedLocalMetricState = new State(selectedLocalMetricServiceState.get()?.Local_Metrics?.[0]);

    const onAdd = () => {
        const onLocalMetricSelected = () => {
            const inputsDisabled = selectedLocalMetricState.get() === undefined;
            ModifySelectedMetric.dom.disabled = inputsDisabled;
            DeleteSelectedMetric.dom.disabled = inputsDisabled;
        };
        onLocalMetricSelected();

        selectedLocalMetricState.addOnUpdateCallback(onLocalMetricSelected, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };

    return {
        component: (
            <div onAdd={onAdd} style={{flexDirection: "column"}}>
                <form action="/api/post/update-local-metric" target="frame" method="POST">
                    <LocalMetricSelector selectedLocalMetricServiceState={selectedLocalMetricServiceState} selectedLocalMetricState={selectedLocalMetricState}/>
                    <LocalMetricModifications selectedLocalMetricConstState={selectedLocalMetricState} />
                    <div style={{marginLeft: "8px"}}>
                        {ModifySelectedMetric.react(<input type="submit" value="Modify selected metric" />)}
                    </div>
                </form>
                <div style={{marginLeft: "8px"}}>
                    {DeleteSelectedMetric.react(<input type="button" value="Delete selected metric" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to delete this metric?\nWARNING: This will remove every application of this metric that you have placed on taggables");
                        if (confirm) {
                            (async () => {
                                await deleteLocalMetric(selectedLocalMetricState.get().Local_Metric_ID);
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