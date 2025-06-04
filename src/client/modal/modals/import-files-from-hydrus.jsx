import { useState } from 'react';
import '../../global.css';
import { User } from '../js/user.js';
import PartialUploadSelector from '../../components/partial-upload-selector.jsx';

/** 
 * @param {{
 *  user: User
 * }}
*/
const ImportFilesFromHydrus = () => {
    const [firstRun, setFirstRun] = useState(true);

    const {PartialSelector, PartialSubmitButton} = PartialUploadSelector({text: "Select hydrus ZIP file (parts) you wish to import:"});

    return (
        <div>
            <form action="/api/post/import-files-from-hydrus" target="frame" method="POST" onSubmit={() => false}>
                {PartialSelector}
                {PartialSubmitButton}
            </form>
            <iframe name="frame" style={{display: "none"}} onLoad={() => {
                if (firstRun) {
                    setFirstRun(false);
                    return;
                }

                console.log("file submission finished");
            }}></iframe>
        </div>
    );
};

export default ImportFilesFromHydrus;

export const MODAL_NAME = "import-files-from-hydrus";
export const MODAL_DISPLAY_NAME = "Import Files From Hydrus";