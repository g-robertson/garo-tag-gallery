import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function CreateURLGeneratorService({ extraProperties, modalResolve }) {
    return {
        component: (
            <div>
                <form action="/api/post/create-url-generator-service" target="frame" method="POST">
                    <div style={{marginLeft: "8px"}}>
                        <div style={{margin: "2px 0 2px 0"}}>
                            <span>Choose a name for your URL generator service: </span>
                            <input name="serviceName" value="My URL Generator service" type="text" />
                        </div>
                    </div>
                    <div style={{marginLeft: "8px"}}>
                        <input type="submit" value="Submit" />
                    </div>
                </form>
                <OnFormSubmit onFormSubmit={async () => {
                    User.refreshGlobal();
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Create URL Generator Service"
    };
};