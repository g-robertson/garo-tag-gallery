import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalMetricServiceModifications from '../../components/local-metric-service-modifications.jsx';

/** @import {User} from "../../js/user.js" */

/** 
 * @param {{
 *  setUser: (user: User) => void
 *  popModal: () => void
 * }}
*/
const CreateLocalMetricService = ({setUser, popModal}) => {
    return (
        <div>
            <form action="/api/post/create-local-metric-service" target="frame" method="POST">
                <LocalMetricServiceModifications />
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
            </form>
            <OnFormSubmit onFormSubmit={async () => {
                setUser(await getMe());
                popModal();
            }} />
        </div>
    );
};

export default CreateLocalMetricService;

export const MODAL_PROPERTIES = {
    modalName: "create-local-metric-service",
    displayName: "Create Local Metric Service"
};
export const CREATE_LOCAL_METRIC_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;