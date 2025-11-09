import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import getMe from '../../../api/client-get/me.js';
import { useState } from 'react';
import LocalTagServiceSelector from '../../components/local-tag-service-selector.jsx';
import LocalTagServiceModifications from '../../components/local-tag-service-modifications.jsx';
import deleteLocalTagService from '../../../api/client-get/delete-local-tag-service.js';

/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 * }}
*/
const UpdateLocalTagService = ({states, setters}) => {
    const defaultLocalTagService = states.user.localTagServices()[0];
    const [selectedLocalTagService, setSelectedLocalTagService] = useState(defaultLocalTagService);

    return (
        <div style={{flexDirection: "column"}}>
            <form action="/api/post/update-local-tag-service" target="frame" method="POST">
                <LocalTagServiceSelector states={states} defaultLocalTagService={defaultLocalTagService} onLocalTagServiceSelected={localTagService => {
                    setSelectedLocalTagService(localTagService);
                }} />
                <LocalTagServiceModifications selectedLocalTagService={selectedLocalTagService} />
                <div style={{marginLeft: "8px"}}>
                    <input disabled={selectedLocalTagService === undefined} type="submit" value="Modify selected tag service" />
                </div>
            </form>
            <div style={{marginLeft: "8px"}}>
                <input disabled={selectedLocalTagService === undefined} type="button" value="Delete selected tag service" onClick={() => {
                    const confirm = window.confirm("Are you sure you want to delete this tag service?\nWARNING: This will remove every tag that exists under this tag service");
                    if (confirm) {
                        (async () => {
                            await deleteLocalTagService(selectedLocalTagService.Local_Tag_Service_ID);
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

export default UpdateLocalTagService;

export const MODAL_PROPERTIES = {
    modalName: "update-local-tag-service",
    displayName: "Update Local Tag Service"
};
export const UPDATE_LOCAL_TAG_SERVICE_MODAL_PROPERTIES = MODAL_PROPERTIES;