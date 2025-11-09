import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalMetricModifications from '../../components/local-metric-modifications.jsx';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import { useState } from 'react';
import deleteLocalMetric from '../../../api/client-get/delete-local-metric.js';

/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 * }}
*/
const CreateLocalMetric = ({states, setters}) => {
    const defaultLocalMetricService = states.user.localMetricServices()[0];
    const defaultLocalMetric = defaultLocalMetricService?.Local_Metrics?.[0];
    const [selectedLocalMetric, setSelectedLocalMetric] = useState(defaultLocalMetric);
    return (
        <div style={{flexDirection: "column"}}>
            <form action="/api/post/update-local-metric" target="frame" method="POST">
                <LocalMetricSelector states={states} defaultLocalMetricService={defaultLocalMetricService} defaultLocalMetric={defaultLocalMetric} onLocalMetricSelected={(localMetric) => {
                    setSelectedLocalMetric(localMetric);
                }}/>
                <LocalMetricModifications selectedLocalMetric={selectedLocalMetric} />
                <div style={{marginLeft: "8px"}}>
                    <input disabled={selectedLocalMetric === undefined} type="submit" value="Modify selected metric" />
                </div>
            </form>
            <div style={{marginLeft: "8px"}}>
                <input disabled={selectedLocalMetric === undefined} type="button" value="Delete selected metric" onClick={() => {
                    const confirm = window.confirm("Are you sure you want to delete this metric?\nWARNING: This will remove every application of this metric that you have placed on taggables");
                    if (confirm) {
                        (async () => {
                            await deleteLocalMetric(selectedLocalMetric.Local_Metric_ID);
                            setters.setUser(await getMe());
                            setters.popModal();
                        })();
                    }
                }} />
            </div>
            <OnFormSubmit onFormSubmit={async () => {
                setters.setUser(await getMe());
                setters.popModal();
            }} />
        </div>
    );
};

export default CreateLocalMetric;

export const MODAL_PROPERTIES = {
    modalName: "update-local-metric",
    displayName: "Update Local Metric"
};
export const UPDATE_LOCAL_METRIC_MODAL_PROPERTIES = MODAL_PROPERTIES;