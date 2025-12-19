import '../global.css';
import getPartialUploadSelections from '../../api/client-get/partial-upload-selections.js';
import getPartialUploadSelectionFragments from '../../api/client-get/partial-upload-selection-fragments.js';
import { executeFunctions, ReferenceableReact } from '../js/client-util.js';
import { State } from '../page/pages.js';
import postPartialFile from '../../api/client-get/partial-file.js';
import getNonPartialUploadCursor, { NOT_A_PARTIAL_UPLOAD } from '../../api/client-get/non-partial-upload-cursor.js';

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
    const PartialUploadSelection = ReferenceableReact();
    const NewPartialUploadLocation = ReferenceableReact();
    const PathCursorID = ReferenceableReact();
    const SubmitButton = ReferenceableReact();
    const FilesSelected = ReferenceableReact();

    const partialUploadSelectionsState = new State(new Set([NOT_A_PARTIAL_UPLOAD]));
    const activePartialUploadSelectionState = new State(NOT_A_PARTIAL_UPLOAD);
    const activePartialUploadSelectionFragmentsState = new State([]);
    const remainingPartialPiecesFinishedState = new State(true);
    
    const onPartialPartsChanged = () => {
        const activePartialUploadSelection = activePartialUploadSelectionState.get();
        getPartialUploadSelectionFragments(activePartialUploadSelection).then(activePartialUploadSelectionFragments => {
            activePartialUploadSelectionFragmentsState.set(activePartialUploadSelectionFragments);
        });
    }

    const onAdd = () => {
        const onPartialUploadSelectionsChanged = () => {
            const partialUploadSelections = [...partialUploadSelectionsState.get()];
            PartialUploadSelection.dom.replaceChildren(...(partialUploadSelections.map(partialUploadSelection => (
                <option dom value={partialUploadSelection}>{partialUploadSelection}</option>
            ))));
        };
        onPartialUploadSelectionsChanged();

        const onActivePartialUploadSelectionChanged = () => {
            const activePartialUploadSelection = activePartialUploadSelectionState.get();
            onPartialPartsChanged();

            RemainingPartialPiecesFinishedFaker.dom.disabled = activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD;
            if (activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
                remainingPartialPiecesFinishedState.set(true);
            }

            for (const option of PartialUploadSelection.dom.children) {
                if (option.value === activePartialUploadSelection) {
                    option.selected = true;
                }
            }
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
                    {PartialUploadSelection.react(
                        <select style={{display: "inline-block"}} name="partialUploadSelection" onChange={(e) => {
                            activePartialUploadSelectionState.set(e.target.options[e.target.selectedIndex].value)
                        }}></select>
                    )}
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Create a new partial upload location to upload to: </span>
                    {NewPartialUploadLocation.react(<input style={{display: "inline-block"}} class="partial-upload-location-text" type="text" placeholder="New Partial Upload Location" />)}
                    <input style={{display: "inline-block", marginLeft: "4px"}} type="button" value="Create" onClick={() => {
                        partialUploadSelectionsState.set(new Set([...partialUploadSelectionsState.get(), NewPartialUploadLocation.dom.value]));
                        activePartialUploadSelectionState.set(NewPartialUploadLocation.dom.value);
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
                {PathCursorID.react(<input type="text" name="pathCursorID" style={{display: "none"}} />)}
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

                    const partialUploadSelection = PartialUploadSelection.dom.value;
                    let pathCursorID;
                    if (partialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
                        pathCursorID = await getNonPartialUploadCursor();
                        PathCursorID.dom.value = pathCursorID;
                    }

                    const filesSelected = FilesSelected.dom.files;
                    for (const file of filesSelected) {
                        const res = await postPartialFile(partialUploadSelection, file, pathCursorID);
                        const text = await res.text();
                        if (res.status !== 200) {
                            onPartialUploadError(text);
                            uploading = false;
                            return;
                        } else {
                            onPartialPartsChanged();
                        }
                    }


                    if (remainingPartialPiecesFinishedState.get() === false) {
                        onPartialUploadFinished();
                        uploading = false;
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