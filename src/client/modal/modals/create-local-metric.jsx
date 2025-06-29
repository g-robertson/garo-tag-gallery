import '../../global.css';
import { User } from '../js/user.js';
import LocalMetricServiceSelector from '../../components/local-metric-service-selector.jsx';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalMetricModifications from '../../components/local-metric-modifications.jsx';


/** 
 * @param {{
 *  user: User
 *  setUser: (user: User) => void
 *  popModal: () => void
 * }}
*/
const CreateLocalMetric = ({user, setUser, popModal}) => {
    return (
        <div>
            <form action="/api/post/create-local-metric" target="frame" method="POST">
                <LocalMetricServiceSelector user={user} />
                <LocalMetricModifications />
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
                <OnFormSubmit onFormSubmit={async () => {
                    setUser(await getMe());
                    popModal();
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