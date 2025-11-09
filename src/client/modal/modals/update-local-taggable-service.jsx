import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import { useState } from 'react';
import LocalTaggableServiceSelector from '../../components/local-taggable-service-selector.jsx';
import deleteLocalTaggableService from '../../../api/client-get/delete-local-taggable-service.js';
import LocalTaggableServiceModifications from '../../components/local-taggable-service-modifications.jsx';

/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 * }}
*/
const UpdateLocalTaggableService = ({states, setters}) => {
    const defaultLocalTaggableService = states.user.localTaggableServices()[0];
    const [selectedLocalTaggableService, setSelectedLocalTaggableService] = useState(defaultLocalTaggableService);

    return (
        <div style={{flexDirection: "column"}}>
            <form action="/api/post/update-local-taggable-service" target="frame" method="POST">
                <LocalTaggableServiceSelector states={states} defaultLocalTaggableService={defaultLocalTaggableService} onLocalTaggableServiceSelected={localTaggableService => {
                    setSelectedLocalTaggableService(localTaggableService);
                }} />
                <LocalTaggableServiceModifications selectedLocalTaggableService={selectedLocalTaggableService} />
                <div style={{marginLeft: "8px"}}>
                    <input disabled={selectedLocalTaggableService === undefined} type="submit" value="Modify selected taggable service" />
                </div>
            </form>
            <div style={{marginLeft: "8px"}}>
                <input disabled={selectedLocalTaggableService === undefined} type="button" value="Delete selected taggable service" onClick={() => {
                    const confirm = window.confirm("Are you sure you want to delete this taggable service?\nWARNING: This will remove every taggable (file/collection) that exists under this taggable service");
                    if (confirm) {
                        (async () => {
                            await deleteLocalTaggableService(selectedLocalTaggableService.Local_Taggable_Service_ID);
                            setters.setUser(await getMe());
                            setters.popModal();
                        })();
                    }
                }} />
            </div>
            <OnFormSubmit onFormSubmit={async () => {
                setters.setUser(await getMe());
                setters.popModal();
            }} />
        </div>
    );
};

export default UpdateLocalTaggableService;

export const MODAL_PROPERTIES = {
    modalName: "update-local-taggable-service",
    displayName: "Update Local Taggable Service"
};
export const UPDATE_LOCAL_TAGGABLE_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;