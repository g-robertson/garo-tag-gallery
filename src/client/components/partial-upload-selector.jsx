import { useEffect, useState } from 'react';
import '../global.css';
import getPartialUploadSelections, { NOT_A_PARTIAL_UPLOAD } from '../../api/client-get/partial-upload-selections.js';
import getPartialUploadSelectionFragments from '../../api/client-get/partial-upload-selection-fragments.js';
import { randomID } from '../js/client-util.js';

/**
 * 
 * @param {{
 *  text: string
 *  onSubmit: () => void
 *  onFinish: () => void
 *  onError: (err: string) => void
 * }} param0
 * @returns 
 */
const PartialUploadSelector = ({text, onSubmit, onFinish, onError}) => {
    const [uniqueID,] = useState(randomID());
    const [partialUploadSelections, setPartialUploadSelections] = useState(new Set([NOT_A_PARTIAL_UPLOAD]));
    const [activePartialUploadSelection, setActivePartialUploadSelection] = useState(NOT_A_PARTIAL_UPLOAD);
    const [activePartialUploadSelectionFragments, setActivePartialUploadSelectionFragments] = useState([]);
    const [remainingPartialPiecesFinished, setRemainingPartialPiecesFinished] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => {
        (async () => {
            const partialUploadSelections_ = await getPartialUploadSelections()
            setPartialUploadSelections(new Set(partialUploadSelections_));
            setActivePartialUploadSelection(partialUploadSelections_[0]);
        })();
    }, []);

    useEffect(() => {
        (async () => {
            setActivePartialUploadSelectionFragments(await getPartialUploadSelectionFragments(activePartialUploadSelection));
        })();

        if (activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
            setRemainingPartialPiecesFinished(true);
        }
    }, [activePartialUploadSelection]);

    return {
        PartialSelector: (
            <div style={{marginLeft: "8px"}}>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Partial upload location: </span>
                    <select style={{display: "inline-block"}} name="partialUploadSelection" onChange={(e) => {
                        setActivePartialUploadSelection(e.target.options[e.target.selectedIndex].value);
                    }}>
                        {[...partialUploadSelections].map(partialUploadSelection => (
                            <option value={partialUploadSelection} selected={(partialUploadSelection === activePartialUploadSelection)}>{partialUploadSelection}</option>
                        ))}
                    </select>
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Create a new partial upload location to upload to: </span>
                    <input style={{display: "inline-block"}} id="newPartialUploadLocation" type="text" placeholder="New Partial Upload Location" />
                    <input style={{display: "inline-block", marginLeft: "4px"}} type="button" value="Create" onClick={() => {
                        setPartialUploadSelections(new Set([...partialUploadSelections, document.getElementById("newPartialUploadLocation").value]));
                    }} />
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Parts already on server: </span>
                    <select style={{display: "inline-block"}}>
                        {[...activePartialUploadSelectionFragments].map(activePartialUploadSelectionFragment => (
                            <option>{activePartialUploadSelectionFragment}</option>
                        ))}
                    </select>
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>{text}</span>
                    <input style={{display: "inline-block", marginLeft: "4px"}}  id={`partialFiles-${uniqueID}`} name="partialFiles" type="file" multiple />
                </div>
                <div style={{margin: "2px 0 2px 0"}}>
                    <span>Are all remaining pieces in this upload:</span>
                    <input
                        style={{display: "inline-block", marginLeft: "4px"}}
                        name="remainingPartialPiecesFinished"
                        disabled={activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD}
                        checked={remainingPartialPiecesFinished}
                        type="checkbox"
                        onChange={(e) => {
                        setRemainingPartialPiecesFinished(!remainingPartialPiecesFinished);
                    }} />
                </div>
            </div>
        ),
        PartialSubmitButton: (
            <div style={{marginLeft: "8px"}}>
                <input type="button" value="Submit" onClick={async () => {
                    if (uploading) {
                        return;
                    }

                    setUploading(true);
                    onSubmit();
                    let trueActivePartialUploadSelection = activePartialUploadSelection
                    if (trueActivePartialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
                      trueActivePartialUploadSelection = `____NOT_PARTIAL____${randomID(16).toString("hex")}`;
                    }
                    
                    const filesSelected = document.getElementById(`partialFiles-${uniqueID}`).files;
                    for (const file of filesSelected) {
                        const formData = new FormData();
                        formData.append("partialUploadSelection", trueActivePartialUploadSelection);
                        formData.append("file", file, file.name);
                        const res = await fetch("/api/post/partial-file", {
                            body: formData,
                            method: "POST"
                        });
                        await res.text();
                    }

                    /** @type {HTMLFormElement} */
                    let outerForm = document.getElementById(`submit-${uniqueID}`);
                    while (outerForm !== null && outerForm.tagName !== "FORM") {
                        outerForm = outerForm.parentElement;
                    }

                    const outerFormData = new FormData(outerForm);
                    const outerFormRes = await fetch(outerForm.action, {
                        body: outerFormData,
                        method: outerForm.method
                    });

                    const response = await outerFormRes.text();
                    if (outerFormRes.status === 200) {
                        onFinish();
                    } else {
                        onError(response);
                    }
                    setUploading(false);
                }}/>
                <input type="submit" id={`submit-${uniqueID}`} style={{display: "none"}} />
            </div>
        )
    };
};

export default PartialUploadSelector;