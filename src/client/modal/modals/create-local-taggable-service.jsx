import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import LocalTaggableServiceModifications from '../../components/local-taggable-service-modifications.jsx';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function CreateLocalTaggableService({ extraProperties, modalResolve }) {
    return {
        component: (
            <div>
                <form action="/api/post/create-local-taggable-service" target="frame" method="POST">
                    <LocalTaggableServiceModifications />
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
        displayName: "Create Local Taggable Service"
    };
};