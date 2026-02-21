import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';

export default function CreateLocalDownloaderService() {
    return {
        component: (
            <div>
                <form action="/api/post/create-local-downloader-service" target="frame" method="POST">
                    <div style={{marginLeft: "8px"}}>
                        <div style={{margin: "2px 0 2px 0"}}>
                            <span>Choose a name for your local downloader service: </span>
                            <input name="serviceName" value="My local downloader service" type="text" />
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
        displayName: "Create Local Downloader Service"
    };
};