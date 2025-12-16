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

    const {PartialSelector, PartialSubmitButton} = PartialUploadSelector({text: "Select hydrus ZIP file (parts) you wish to import:", onSubmitClick: () => {
        FinishedImporting.dom.textContent = "";
    }, onPartialUploadFinished: () => {
        FinishedImporting.dom.textContent = "Finished uploading specified files. Continue by uploading either more partial parts or finishing the upload by selecting the all remaining pieces checkbox and submitting";
    }, onPartialUploadError: (err) => {
        FinishedImporting.dom.textContent = `Error occured while uploading partial files: ${err}`;
    }, onFormSubmitFinished: async () => {
        await Jobs.refreshGlobal();
        FinishedImporting.dom.textContent = "Began job to import from Hydrus";
    }, onFormSubmitError: (err) => {
        if (err.includes("No directory found with partialUploadPath")) {
            FinishedImporting.dom.textContent = "No uploaded files were found under this partial upload path, try making sure you have your files selected and re-try the operation";
        } else {
            FinishedImporting.dom.textContent = `Error occured while creating import job: ${err}`;
        }
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