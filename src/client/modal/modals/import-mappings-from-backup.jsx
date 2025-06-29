import { useState } from 'react';
import '../../global.css';
import { User } from '../js/user.js';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';

/** 
 * @param {{
 *  user: User
 * }}
*/
const ImportMappingsFromBackup = ({user}) => {
    const [finishedImportingText, setFinishedImportingText] = useState("");

    return (
        <div>
            <form enctype="multipart/form-data" action="/api/post/import-mappings-from-backup" target="frame" method="POST">
                <input type="file" name="backup-file" />
                <input type="submit" value="Import from backup" />
            </form>
            <OnFormSubmit onFormSubmit={() => {
                setFinishedImportingText("Finished importing from backup");
            }} />
            <p style={{color: "green"}}>{finishedImportingText}</p>
        </div>
    );
};

export default ImportMappingsFromBackup;

export const MODAL_PROPERTIES = {
    modalName: "import-mappings-from-backup",
    displayName: "Import Mappings From Backup"
};
export const IMPORT_MAPPINGS_FROM_BACKUP_MODAL_PROPERTIES = MODAL_PROPERTIES;