import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalTaggableServiceSelector from '../../components/local-taggable-service-selector.jsx';
import deleteLocalTaggableService from '../../../api/client-get/delete-local-taggable-service.js';
import LocalTaggableServiceModifications from '../../components/local-taggable-service-modifications.jsx';
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
export default function UpdateLocalTaggableService({ extraProperties, modalResolve }) {
    const ModifySelectedTaggableService = ReferenceableReact();
    const DeleteSelectedTaggableService = ReferenceableReact();
    const selectedLocalTaggableServiceRef = ExistingState.stateRef(User.Global().localTaggableServices()[0]);

    const onAdd = () => {
        const onLocalTaggableServiceSelected = () => {
            const inputsDisabled = selectedLocalTaggableServiceRef.get() === undefined;
            ModifySelectedTaggableService.dom.disabled = inputsDisabled;
            DeleteSelectedTaggableService.dom.disabled = inputsDisabled;
        };
        onLocalTaggableServiceSelected();

        let cleanup = () => {};
        cleanup = selectedLocalTaggableServiceRef.addOnUpdateCallback(onLocalTaggableServiceSelected, cleanup);
        return cleanup;
    };

    return {
        component: (
            <div style={{flexDirection: "column"}} onAdd={onAdd}>
                <form action="/api/post/update-local-taggable-service" target="frame" method="POST">
                    <LocalTaggableServiceSelector selectedLocalTaggableServiceRef={selectedLocalTaggableServiceRef} />
                    <LocalTaggableServiceModifications selectedLocalTaggableServiceConstRef={selectedLocalTaggableServiceRef} />
                    <div style={{marginLeft: "8px"}}>
                        {ModifySelectedTaggableService.react(<input type="submit" value="Modify selected taggable service" />)}
                    </div>
                </form>
                <div style={{marginLeft: "8px"}}>
                    {DeleteSelectedTaggableService.react(<input type="button" value="Delete selected taggable service" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to delete this taggable service?\nWARNING: This will remove every taggable (file/collection) that exists under this taggable service");
                        if (confirm) {
                            (async () => {
                                await deleteLocalTaggableService(selectedLocalTaggableServiceRef.get().Local_Taggable_Service_ID);
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
        displayName: "Update Local Taggable Service"
    };
};