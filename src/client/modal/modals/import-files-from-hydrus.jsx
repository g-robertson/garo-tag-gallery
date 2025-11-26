import '../../global.css';
import PartialUploadSelector from '../../components/partial-upload-selector.jsx';
import LocalTaggableServiceSelector from '../../components/local-taggable-service-selector.jsx';
import LocalTagServiceSelector from '../../components/local-tag-service-selector.jsx';
import { ReferenceableReact } from '../../js/client-util.js';
import { Jobs } from '../../jobs.js';

/** @import {ExtraProperties} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function ImportFilesFromHydrus({ extraProperties, modalResolve }) {
    const FinishedImporting = ReferenceableReact();

    const {PartialSelector, PartialSubmitButton} = PartialUploadSelector({text: "Select hydrus ZIP file (parts) you wish to import:", onSubmit: () => {
        FinishedImporting.dom.textContent = "";
    }, onFinish: async () => {
        await Jobs.refreshGlobal();
        FinishedImporting.dom.textContent = "Finished importing from hydrus";
    }, onError: (err) => {
        FinishedImporting.dom.textContent = `Error occured while importing from hydrus: ${err}`;
    }});

    return {
        component: <div>
            <form action="/api/post/import-files-from-hydrus" target="frame" method="POST">
                {PartialSelector}
                <LocalTaggableServiceSelector />
                <LocalTagServiceSelector />
                {PartialSubmitButton}
            </form>
            {FinishedImporting.react(<p style={{color: "green", flex: 1}}></p>)}
        </div>,
        displayName: "Import Files From Hydrus"
    };
};