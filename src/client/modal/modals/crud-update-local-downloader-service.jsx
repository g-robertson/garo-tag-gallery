import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalDownloaderServiceModifications from '../../components/local-downloader-service-modifications.jsx';
import LocalDownloaderServiceSelector from '../../components/local-downloader-service-selector.jsx';
import deleteLocalDownloaderService from '../../../api/client-get/delete-local-downloader-service.js';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';
import { State } from '../../js/state.js';

export default function UpdateLocalDownloaderService() {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const ModifySelectedDownloaderService = ReferenceableReact();
    const DeleteSelectedDownloaderService = ReferenceableReact();
    const selectedLocalDownloaderServiceState = new State(User.Global().localDownloaderServices()[0]);

    const onAdd = () => {
        const onLocalDownloaderServiceSelected = () => {
            const inputsDisabled = selectedLocalDownloaderServiceState.get() === undefined;
            ModifySelectedDownloaderService.dom.disabled = inputsDisabled;
            DeleteSelectedDownloaderService.dom.disabled = inputsDisabled;
        };
        onLocalDownloaderServiceSelected();

        selectedLocalDownloaderServiceState.addOnUpdateCallback(onLocalDownloaderServiceSelected, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };


    return {
        component: (
            <div onAdd={onAdd} style={{flexDirection: "column"}}>
                <form action="/api/post/update-local-downloader-service" target="frame" method="POST">
                    <LocalDownloaderServiceSelector selectedLocalDownloaderServiceState={selectedLocalDownloaderServiceState} />
                    <LocalDownloaderServiceModifications selectedLocalDownloaderServiceConstState={selectedLocalDownloaderServiceState} />
                    <div style={{marginLeft: "8px"}}>
                        {ModifySelectedDownloaderService.react(<input type="submit" value="Modify selected downloader service" />)}
                    </div>
                </form>
                <div style={{marginLeft: "8px"}}>
                    {DeleteSelectedDownloaderService.react(<input type="button" value="Delete selected downloader service" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to delete this downloader service?\nWARNING: This will remove every Metric that exists under this downloader service");
                        if (confirm) {
                            (async () => {
                                await deleteLocalDownloaderService(selectedLocalDownloaderServiceState.get().Local_Downloader_Service_ID);
                                User.refreshGlobal();
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
        displayName: "Update Local Downloader Service"
    };
};