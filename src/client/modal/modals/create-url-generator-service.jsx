import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';

/** @import {User} from "../../js/user.js" */

/** 
 * @param {{
 *  setUser: (user: User) => void
 *  popModal: () => void
 * }}
*/
const CreateURLGeneratorService = ({setUser, popModal}) => {
    return (
        <div>
            <form action="/api/post/create-url-generator-service" target="frame" method="POST">
                <div style={{marginLeft: "8px"}}>
                    <div style={{margin: "2px 0 2px 0"}}>
                        <span>Choose a name for your URL generator service: </span>
                        <input name="serviceName" defaultValue="My URL Generator service" type="text" />
                    </div>
                </div>
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

export default CreateURLGeneratorService;

export const MODAL_PROPERTIES = {
    modalName: "create-url-generator-service",
    displayName: "Create URL Generator Service"
};
export const CREATE_URL_GENERATOR_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;