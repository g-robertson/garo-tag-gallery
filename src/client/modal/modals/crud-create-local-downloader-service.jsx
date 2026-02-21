import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import LocalDownloaderServiceModifications from '../../components/local-downloader-service-modifications.jsx';

export default function CreateLocalDownloaderService() {
    return {
        component: (
            <div>
                <form action="/api/post/create-local-downloader-service" target="frame" method="POST">
                    <LocalDownloaderServiceModifications />
                    <div style={{marginLeft: "8px"}}>
                        <input type="submit" value="Create downloader service" />
                    </div>
                </form>
                <OnFormSubmit onFormSubmit={async () => {
                    User.refreshGlobal();
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Create Local Downloader Service"
    };
};