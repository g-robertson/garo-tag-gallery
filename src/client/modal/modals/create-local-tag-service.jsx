import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalTagServiceModifications from '../../components/local-tag-service-modifications.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';

export default function CreateLocalTagService() {
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