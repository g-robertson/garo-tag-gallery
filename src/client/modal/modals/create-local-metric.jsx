import '../../global.css';
import LocalMetricServiceSelector from '../../components/local-metric-service-selector.jsx';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalMetricModifications from '../../components/local-metric-modifications.jsx';


/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 * }}
*/
const CreateLocalMetric = ({states, setters}) => {
    return (
        <div>
            <form action="/api/post/create-local-metric" target="frame" method="POST">
                <LocalMetricServiceSelector states={states} />
                <LocalMetricModifications />
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
                <OnFormSubmit onFormSubmit={async () => {
                    setters.setUser(await getMe());
                    setters.popModal();
                }} />
            </form>
        </div>
    );
};

export default CreateLocalMetric;

export const MODAL_PROPERTIES = {
    modalName: "create-local-metric",
    displayName: "Create Local Metric"
};
export const CREATE_LOCAL_METRIC_MODAL_PROPERTIES = MODAL_PROPERTIES;