import '../../global.css';
import LocalMetricServiceSelector from '../../components/local-metric-service-selector.jsx';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricModifications from '../../components/local-metric-modifications.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';

export default function CreateLocalMetric() {
    return {
        component: <div>
            <form action="/api/post/create-local-metric" target="frame" method="POST">
                <LocalMetricServiceSelector />
                <LocalMetricModifications />
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
                <OnFormSubmit onFormSubmit={async () => {
                    User.refreshGlobal();
                    Modals.Global().popModal();
                }} />
            </form>
        </div>,
        displayName: "Create Local Metric"
    };
};