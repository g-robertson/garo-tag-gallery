import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';

/** 
 * @param {{
 *  popModal: () => void
 * }}
*/
const CreateMetricService = ({popModal}) => {
    return (
        <div>
            <form action="/api/post/create-metric-service" target="frame" method="POST">
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span>Choose a name for your metric service: </span>
                        <input name="serviceName" defaultValue="My metric service" type="text" />
                    </div>
                </div>
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
            </form>
            <OnFormSubmit onFormSubmit={popModal} />
        </div>
    );
};

export default CreateMetricService;

export const MODAL_PROPERTIES = {
    modalName: "create-metric-service",
    displayName: "Create Metric Service"
};