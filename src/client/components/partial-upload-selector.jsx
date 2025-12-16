import '../global.css';
import getPartialUploadSelections, { NOT_A_PARTIAL_UPLOAD } from '../../api/client-get/partial-upload-selections.js';
import getPartialUploadSelectionFragments from '../../api/client-get/partial-upload-selection-fragments.js';
import { executeFunctions, randomID, ReferenceableReact } from '../js/client-util.js';
import { State } from '../page/pages.js';

function sanitizePartialUploadSelection(activePartialUploadSelection) {
    if (activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
        return `____NOT_PARTIAL____${randomID(16).toString("hex")}`;
    }
    return activePartialUploadSelection;
}

/**
 * 
 * @param {{
 *  text: string
 *  onSubmitClick?: () => void
 *  onPartialUploadFinished?: () => void
 *  onPartialUploadError?: (err: string) => void
 *  onFormSubmitFinished?: () => void
 *  onFormSubmitError?: (err: string) => void
 * }} param0
 * @returns 
 */
const PartialUploadSelector = ({text, onSubmitClick, onPartialUploadFinished, onPartialUploadError, onFormSubmitFinished, onFormSubmitError}) => {
    onSubmitClick ??= () => {};
    onPartialUploadFinished ??= () => {};
    onPartialUploadError ??= () => {};
    onFormSubmitFinished ??= () => {};
    onFormSubmitError ??= () => {};
    /** @type {(() => void)[]} */
    const addToCleanup = [];
    const RemainingPartialPiecesFinishedReal = ReferenceableReact();
    const RemainingPartialPiecesFinishedFaker = ReferenceableReact();
    const ActivePartialUploadSelectionFragments = ReferenceableReact();
    const PartialUploadSelectionFaker = ReferenceableReact();
    const PartialUploadSelectionReal = ReferenceableReact();
    const NewPartialUploadLocation = ReferenceableReact();
    const SubmitButton = ReferenceableReact();
    const FilesSelected = ReferenceableReact();

    const partialUploadSelectionsState = new State(new Set([NOT_A_PARTIAL_UPLOAD]));
    const activePartialUploadSelectionState = new State(NOT_A_PARTIAL_UPLOAD);
    const activePartialUploadSelectionFragmentsState = new State([]);
    const remainingPartialPiecesFinishedState = new State(true);
    
    const onAdd = () => {
        const onPartialUploadSelectionsChanged = () => {
            const partialUploadSelections = [...partialUploadSelectionsState.get()];
            PartialUploadSelectionFaker.dom.replaceChildren(...(partialUploadSelections.map(partialUploadSelection => (
                <option dom value={partialUploadSelection}>{partialUploadSelection}</option>
            ))));
        };
        onPartialUploadSelectionsChanged();

        const onActivePartialUploadSelectionChanged = () => {
            const activePartialUploadSelection = activePartialUploadSelectionState.get();
            getPartialUploadSelectionFragments(activePartialUploadSelection).then(activePartialUploadSelectionFragments => {
                activePartialUploadSelectionFragmentsState.set(activePartialUploadSelectionFragments);
            });

            RemainingPartialPiecesFinishedFaker.dom.disabled = activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD;
            if (activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
                remainingPartialPiecesFinishedState.set(true);
            }

            PartialUploadSelectionReal.dom.value = sanitizePartialUploadSelection(activePartialUploadSelection);
        }
        onActivePartialUploadSelectionChanged();

        partialUploadSelectionsState.addOnUpdateCallback(onPartialUploadSelectionsChanged, addToCleanup);
        activePartialUploadSelectionState.addOnUpdateCallback(onActivePartialUploadSelectionChanged, addToCleanup);
        activePartialUploadSelectionFragmentsState.addOnUpdateCallback(activePartialUploadSelectionFragments => {
            ActivePartialUploadSelectionFragments.dom.replaceChildren(...(activePartialUploadSelectionFragments.map(activePartialUploadSelectionFragment => 
                <option dom value={activePartialUploadSelectionFragment}>{activePartialUploadSelectionFragment}</option>
            )));
        }, addToCleanup);
        remainingPartialPiecesFinishedState.addOnUpdateCallback(remainingPartialPiecesFinished => {
            RemainingPartialPiecesFinishedFaker.dom.checked = remainingPartialPiecesFinished;
            RemainingPartialPiecesFinishedReal.dom.checked = remainingPartialPiecesFinished;
        }, addToCleanup);

        
        (async () => {
            const existingPartialUploadSelections = await getPartialUploadSelections()
            partialUploadSelectionsState.set(new Set(existingPartialUploadSelections));
            activePartialUploadSelectionState.set(existingPartialUploadSelections[0]);
        })();

        return () => executeFunctions(addToCleanup);
    };

    let uploading = false;

    return {
        PartialSelector: (
            <div onAdd={onAdd} style={{marginLeft: "8px", flexDirection: "column"}}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Partial upload location: </span>
                    {PartialUploadSelectionReal.react(<input type="text" name="partialUploadSelection" style={{display: "none"}} />)}
                    {PartialUploadSelectionFaker.react(
                        <select style={{display: "inline-block"}} name="partialUploadSelectionFake" onChange={(e) => {
                            activePartialUploadSelectionState.set(e.target.options[e.target.selectedIndex].value)
                        }}></select>
                    )}
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Create a new partial upload location to upload to: </span>
                    {NewPartialUploadLocation.react(<input style={{display: "inline-block"}} type="text" placeholder="New Partial Upload Location" />)}
                    <input style={{display: "inline-block", marginLeft: "4px"}} type="button" value="Create" onClick={() => {
                        partialUploadSelectionsState.set(new Set([...partialUploadSelectionsState.get(), NewPartialUploadLocation.dom.value]));
                    }} />
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Parts already on server: </span>
                    {ActivePartialUploadSelectionFragments.react(<select style={{display: "inline-block"}}></select>)}
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>{text}</span>
                    {FilesSelected.react(<input style={{display: "inline-block", marginLeft: "4px"}} name="partialFiles" type="file" multiple />)}
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Are all remaining pieces in this upload:</span>
                    {RemainingPartialPiecesFinishedReal.react(<input name="remainingPartialPiecesFinished" type="checkbox" style={{display: "none"}} />)}
                    {RemainingPartialPiecesFinishedFaker.react(<input
                        style={{display: "inline-block", marginLeft: "4px"}}
                        name="remainingPartialPiecesFinishedFake"
                        type="checkbox"
                        onChange={(e) => {
                            remainingPartialPiecesFinishedState.set(e.currentTarget.checked);
                        }}
                    />)}
                </div>
            </div>
        ),
        PartialSubmitButton: (
            <div style={{marginLeft: "8px"}}>
                <input type="button" value="Submit" onClick={async () => {
                    if (uploading) {
                        return;
                    }

                    uploading = true;
                    onSubmitClick();
                    
                    const filesSelected = FilesSelected.dom.files;
                    for (const file of filesSelected) {
                        const formData = new FormData();
                        formData.append("partialUploadSelection", PartialUploadSelectionReal.dom.value);
                        formData.append("file", file, file.name);
                        const res = await fetch("/api/post/partial-file", {
                            body: formData,
                            method: "POST"
                        });
                        const text = await res.text();
                        if (res.status !== 200) {
                            onPartialUploadError(text);
                            return;
                        }
                    }


                    if (remainingPartialPiecesFinishedState.get() === false) {
                        onPartialUploadFinished();
                        return;
                    }

                    /** @type {HTMLFormElement} */
                    let outerForm = SubmitButton.dom;
                    while (outerForm !== null && outerForm.tagName !== "FORM") {
                        outerForm = outerForm.parentElement;
                    }

                    const outerFormData = new FormData(outerForm);
                    outerFormData.delete("partialFiles");
                    const outerFormRes = await fetch(outerForm.action, {
                        body: outerFormData,
                        method: outerForm.method
                    });

                    const text = await outerFormRes.text();
                    if (outerFormRes.status === 200) {
                        onFormSubmitFinished();
                    } else {
                        onFormSubmitError(text);
                    }
                    uploading = false;
                }}/>
                {SubmitButton.react(<input type="submit" style={{display: "none"}} />)}
            </div>
        )
    };
};

export default PartialUploadSelector;