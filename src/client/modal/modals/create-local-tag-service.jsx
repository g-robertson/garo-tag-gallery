import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalTagServiceModifications from '../../components/local-tag-service-modifications.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function CreateLocalTagService({ extraProperties, modalResolve }) {
    return {
        component: (
            <div>
                <form action="/api/post/create-local-tag-service" target="frame" method="POST">
                    <LocalTagServiceModifications />
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
        displayName: "Create Local Tag Service"
    };
};