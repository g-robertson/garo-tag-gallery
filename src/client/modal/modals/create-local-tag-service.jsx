import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import LocalTagServiceModifications from '../../components/local-tag-service-modifications.jsx';

/** @import {User} from "../../js/user.js" */

/** 
 * @param {{
 *  setUser: (user: User) => void
 *  popModal: () => void
 * }}
*/
const CreateLocalTagService = ({setUser, popModal}) => {
    return (
        <div>
            <form action="/api/post/create-local-tag-service" target="frame" method="POST">
                <LocalTagServiceModifications />
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

export default CreateLocalTagService;

export const MODAL_PROPERTIES = {
    modalName: "create-local-tag-service",
    displayName: "Create Local Tag Service"
};
export const CREATE_LOCAL_TAG_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;