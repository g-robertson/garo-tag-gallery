import { useState } from 'react';
import '../../global.css';
import { User } from '../js/user.js';
import PartialUploadSelector from '../../components/partial-upload-selector.jsx';
import LocalTaggableServiceSelector from '../../components/local-taggable-service-selector.jsx';
import LocalTagServiceSelector from '../../components/local-tag-service-selector.jsx';

/** 
 * @param {{
 *  user: User
 * }}
*/
const ImportFilesFromHydrus = ({user}) => {
    const [finishedImportingText, setFinishedImportingText] = useState("");

    const {PartialSelector, PartialSubmitButton} = PartialUploadSelector({text: "Select hydrus ZIP file (parts) you wish to import:", onSubmit: () => {
        setFinishedImportingText("");
    }, onFinish: () => {
        setFinishedImportingText("Finished importing from hydrus");
    }, onError: (err) => {
        setFinishedImportingText(`Error occured while importing from hydrus: ${err}`)
    }});

    return (
        <div>
            <form action="/api/post/import-files-from-hydrus" target="frame" method="POST">
                {PartialSelector}
                <LocalTaggableServiceSelector user={user} />
                <LocalTagServiceSelector user={user} />
                {PartialSubmitButton}
            </form>
            <p style={{color: "green"}}>{finishedImportingText}</p>
        </div>
    );
};

export default ImportFilesFromHydrus;

export const MODAL_PROPERTIES = {
    modalName: "import-files-from-hydrus",
    displayName: "Import Files From Hydrus"
};
export const IMPORT_FILES_FROM_HYDRUS_MODAL_PROPERTIES = MODAL_PROPERTIES;