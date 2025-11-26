import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import { Jobs } from '../../jobs.js';
import { ReferenceableReact } from '../../js/client-util.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function ImportMappingsFromBackup({ extraProperties, modalResolve }) {
    const FinishedImporting = ReferenceableReact();

    return {
        component: <div>
            <form enctype="multipart/form-data" action="/api/post/import-mappings-from-backup" target="frame" method="POST">
                <input type="file" name="backup-file" />
                <input type="submit" value="Import from backup" />
            </form>
            <OnFormSubmit onFormSubmit={async () => {
                FinishedImporting.dom.textContent = "Started importing from backup";
                await Jobs.refreshGlobal();
            }} />
            {FinishedImporting.react(<p style={{color: "green"}}></p>)}
        </div>,
        displayName: "Import Mappings From Backup"
    };
};