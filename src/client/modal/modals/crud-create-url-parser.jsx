import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import LocalDownloaderServiceSelector from '../../components/local-downloader-service-selector.jsx';
import URLParserModifications from '../../components/url-parser-modifications.jsx';

export default function CreateURLParser() {
    return {
        component: <div>
            <form action="/api/post/create-url-parser" target="frame" method="POST">
                <LocalDownloaderServiceSelector />
                <URLParserModifications />
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Create URL parser" />
                </div>
                <OnFormSubmit onFormSubmit={async () => {
                    User.refreshGlobal();
                    Modals.Global().popModal();
                }} />
            </form>
        </div>,
        displayName: "Create Local Metric"
    };
};