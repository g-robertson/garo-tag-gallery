import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import LocalTaggableServiceModifications from '../../components/local-taggable-service-modifications.jsx';

export default function CreateLocalTaggableService() {
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