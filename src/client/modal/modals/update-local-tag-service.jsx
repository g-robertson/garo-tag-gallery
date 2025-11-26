import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalTagServiceSelector from '../../components/local-tag-service-selector.jsx';
import LocalTagServiceModifications from '../../components/local-tag-service-modifications.jsx';
import deleteLocalTagService from '../../../api/client-get/delete-local-tag-service.js';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import { ExistingState } from '../../page/pages.js';
import { ReferenceableReact } from '../../js/client-util.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function UpdateLocalTagService({ extraProperties, modalResolve }) {
    const ModifySelectedTagService = ReferenceableReact();
    const DeleteSelectedTagService = ReferenceableReact();
    const selectedLocalTagServiceRef = ExistingState.stateRef(User.Global().localTagServices()[0]);

    const onAdd = () => {
        const onLocalTagServiceSelected = () => {
            const inputsDisabled = selectedLocalTagServiceRef.get() === undefined;
            ModifySelectedTagService.dom.disabled = inputsDisabled;
            DeleteSelectedTagService.dom.disabled = inputsDisabled;
        };
        onLocalTagServiceSelected();

        let cleanup = () => {};
        cleanup = selectedLocalTagServiceRef.addOnUpdateCallback(onLocalTagServiceSelected, cleanup);
        return cleanup;
    };

    return {
        component: (
            <div style={{flexDirection: "column"}} onAdd={onAdd}>
                <form action="/api/post/update-local-tag-service" target="frame" method="POST">
                    <LocalTagServiceSelector selectedLocalTagServiceRef={selectedLocalTagServiceRef} />
                    <LocalTagServiceModifications selectedLocalTagServiceConstRef={selectedLocalTagServiceRef} />
                    <div style={{marginLeft: "8px"}}>
                        {ModifySelectedTagService.react(<input type="submit" value="Modify selected tag service" />)}
                    </div>
                    
                </form>
                <div style={{marginLeft: "8px"}}>
                    {DeleteSelectedTagService.react(<input type="button" value="Delete selected tag service" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to delete this tag service?\nWARNING: This will remove every tag that exists under this tag service");
                        if (confirm) {
                            (async () => {
                                await deleteLocalTagService(selectedLocalTagServiceRef.get().Local_Tag_Service_ID);
                                await User.refreshGlobal();
                                Modals.Global().popModal();
                            })();
                        }
                    }} />)}
                </div>
                <OnFormSubmit onFormSubmit={async () => {
                    User.refreshGlobal();
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Update Local Tag Service"
    };
};