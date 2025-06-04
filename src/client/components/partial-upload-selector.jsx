import { useEffect, useState } from 'react';
import '../global.css';
import getPartialUploadSelections, { NOT_A_PARTIAL_UPLOAD } from '../../api/client-get/partial-upload-selections.js';
import getPartialUploadSelectionFragments from '../../api/client-get/partial-upload-selection-fragments.js';
import { randomID } from '../js/client-util.js';

const PartialUploadSelector = () => {
    const [uniqueID,] = useState(randomID());
    const [partialUploadSelections, setPartialUploadSelections] = useState(new Set([NOT_A_PARTIAL_UPLOAD]));
    const [activePartialUploadSelection, setActivePartialUploadSelection] = useState(NOT_A_PARTIAL_UPLOAD);
    const [activePartialUploadSelectionFragments, setActivePartialUploadSelectionFragments] = useState([]);
    const [remainingPartialPiecesFinished, setRemainingPartialPiecesFinished] = useState(true);
    
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
            <div>
                <select name="partialUploadSelection" onChange={(e) => {
                    setActivePartialUploadSelection(e.target.options[e.target.selectedIndex].value);
                }}>
                    {[...partialUploadSelections].map(partialUploadSelection => (
                        <option value={partialUploadSelection} selected={(partialUploadSelection === activePartialUploadSelection)}>{partialUploadSelection}</option>
                    ))}
                </select>
                Create a new partial upload location to upload to: 
                <input id="newPartialUploadLocation" type="text" placeholder="New Partial Upload Location" />
                <input type="button" value="Create" onClick={() => {
                    setPartialUploadSelections(new Set([...partialUploadSelections, document.getElementById("newPartialUploadLocation").value]));
                }} />
                Existing Parts: <select>
                    {[...activePartialUploadSelectionFragments].map(activePartialUploadSelectionFragment => (
                        <option>{activePartialUploadSelectionFragment}</option>
                    ))}
                </select>
                Additional pieces to upload:
                <input id={`partialFiles-${uniqueID}`} name="partialFiles" type="file" multiple />
                Are all remaining pieces in this upload:
                <input
                    name="remainingPartialPiecesFinished"
                    disabled={activePartialUploadSelection === NOT_A_PARTIAL_UPLOAD}
                    checked={remainingPartialPiecesFinished}
                    type="checkbox"
                    onChange={(e) => {
                    setRemainingPartialPiecesFinished(!remainingPartialPiecesFinished);
                }} />
            </div>
        ),
        PartialSubmitButton: (
            <div>
                <input type="button" value="Submit" onClick={async () => {
                    let trueActivePartialUploadSelection = activePartialUploadSelection
                    if (trueActivePartialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
                      trueActivePartialUploadSelection = `____NOT_PARTIAL____${randomID(16).toString("hex")}`;
                    }
                    
                    const filesSelected = document.getElementById(`partialFiles-${uniqueID}`).files;
                    for (const file of filesSelected) {
                        const formData = new FormData();
                        formData.append("partialUploadSelection", trueActivePartialUploadSelection);
                        formData.append("file", file, file.name);
                        console.log(formData);
                        const res = await fetch("/api/post/partial-file", {
                            body: formData,
                            method: "POST"
                        });
                        console.log(res.status, await res.text());
                    }

                    document.getElementById(`submit-${uniqueID}`).click();
                }}/>
                <input type="submit" id={`submit-${uniqueID}`} style={{display: "none"}} />
            </div>
        )
    };
};

export default PartialUploadSelector;