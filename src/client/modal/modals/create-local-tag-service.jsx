import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalTagServiceModifications from '../../components/local-tag-service-modifications.jsx';

/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *     setters: Setters
 * }}
*/
const CreateLocalTagService = ({setters}) => {
    return (
        <div>
            <form action="/api/post/create-local-tag-service" target="frame" method="POST">
                <LocalTagServiceModifications />
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
            </form>
            <OnFormSubmit onFormSubmit={async () => {
                setters.setUser(await getMe());
                setters.popModal();
            }} />
        </div>
    );
};

export default CreateLocalTagService;

export const MODAL_PROPERTIES = {
    modalName: "create-local-tag-service",
    displayName: "Create Local Tag Service"
};
export const CREATE_LOCAL_TAG_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;