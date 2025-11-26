import { preload } from 'react-dom';
import '../global.css';
import { randomID } from '../js/client-util.js';
import LazySelector from './lazy-selector.jsx';
import { useEffect, useRef, useState } from 'react';
import selectFiles from '../../api/client-get/select-files.js';
import { ExistingState } from "../page/pages.js";

/** @import {DBFileComparison} from "../../db/duplicates.js" */

/**
 * @param {{
 *  fileComparisons: DBFileComparison[]
 *  initialFileComparisonIndex?: number
 *  existingState: ExistingState
 * }} param0
 */
const LazyDedupeGallery = ({fileComparisons, initialFileComparisonIndex, existingState}) => {
    const galleryID = useRef(randomID(32));
    initialFileComparisonIndex ??= existingState.get("visibleIndex") ?? 0;
    if (initialFileComparisonIndex === -1) {
        initialFileComparisonIndex = 0;
    }
    const [visibleIndex, setVisibleIndex] = useState(initialFileComparisonIndex);

    fileComparisons ??= existingState.get("fileComparisons");
    existingState.update("fileComparisons", fileComparisons);

    const fileComparisonsEvaluated = useRef(existingState?.fileComparisonsEvaluated ?? {});
    const updateFileComparisonsEvaluated = (newFileComparisonsEvaluated) => {
        fileComparisonsEvaluated.current = newFileComparisonsEvaluated;
        existingState.update("fileComparisonsEvaluated", fileComparisonsEvaluated.current);
    }

    /** @type {{out: (increment: number) => void}} */
    const incrementIndex = {};

    /** @type {["File_1" | "File_2", (file: "File_1" | "File_2") => void]} */
    const [activeFile, setActiveFile] = useState("File_1");
    const VIDEO_ID = `video-${galleryID}`;

    useEffect(() => {
        existingState.update("visibleIndex", visibleIndex);

        let vid = document.getElementById(VIDEO_ID);
        if (vid !== null) {
            vid.load();
        }
    }, [visibleIndex]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowRight") {
                if (activeFile === "File_1") {
                    setActiveFile("File_2");
                } else {
                    setActiveFile("File_1");
                }
            }
        }
        const onWheel = (e) => {
            if (activeFile === "File_1") {
                setActiveFile("File_2");
            } else {
                setActiveFile("File_1");
            }
        }

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("wheel", onWheel);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("wheel", onWheel);
        }
    }, [activeFile]);

    return <LazySelector
        valuesConstRef={fileComparisons}
        realizeSelectedValues={false}
        valuesRealizer={async (values) => {
            /** @type {Set<number>} */
            const filesSet = new Set();
            for (const value of values) {
                filesSet.add(value.File_ID_1);
                filesSet.add(value.File_ID_2);
            }
            const fileMap = new Map((await selectFiles([...filesSet])).map(file => [
                file.File_ID,
                file
            ]));
            
            for (const file of fileMap.values()) {
                preload(`images-database/${file.File_Hash.slice(0, 2)}/${file.File_Hash.slice(2, 4)}/${file.File_Hash}.thumb.jpg`, {
                    "fetchPriority": "high",
                    "as": "image"
                });
            }

            return values.map(value => ({
                ...value,
                File_1: fileMap.get(value.File_ID_1),
                File_2: fileMap.get(value.File_ID_2)
            }));
        }}
        customItemComponent={({realizedValue, index}) => {
            if (visibleIndex !== index) {
                setVisibleIndex(index);
            }
            const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm"];
            const src = `images-database/${realizedValue[activeFile].File_Hash.slice(0, 2)}/${realizedValue[activeFile].File_Hash.slice(2, 4)}/${realizedValue[activeFile].File_Hash}${realizedValue[activeFile].File_Extension}`;

            return <div style={{width: "100%", height: "100%", justifyContent: "center"}}>
                <div style={{position: "absolute", bottom: "20px", left: "4px"}}>
                    {visibleIndex + 1} / {fileComparisons.length}
                </div>
                <div style={{position: "absolute", bottom: "4px", left: "4px"}}>
                    Comparisons made: {visibleIndex + 1} / {fileComparisons.length}
                </div>
                <div style={{position: "absolute", top: "3vh", right: "4px", flexDirection: "column"}}>
                    <input type="button" value="Current is better, trash other" onClick={() => {
                        updateFileComparisonsEvaluated({
                            ...fileComparisonsEvaluated.current,
                            [visibleIndex]: {
                                type: "duplicates",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2,
                                Better_File_ID: realizedValue[activeFile].File_ID,
                                trashWorse: true
                            }
                        });
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="Current is better" onClick={() => {
                        updateFileComparisonsEvaluated({
                            ...fileComparisonsEvaluated.current,
                            [visibleIndex]: {
                                type: "duplicates",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2,
                                Better_File_ID: realizedValue[activeFile].File_ID,
                                trashWorse: false
                            }
                        });
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="Same quality, trash larger" onClick={() => {
                        updateFileComparisonsEvaluated({
                            ...fileComparisonsEvaluated.current,
                            [visibleIndex]: {
                                type: "duplicates",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2,
                                Better_File_ID: null,
                                trashWorse: true
                            }
                        });
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="Same quality" onClick={() => {
                        updateFileComparisonsEvaluated({
                            ...fileComparisonsEvaluated.current,
                            [visibleIndex]: {
                                type: "duplicates",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2,
                                Better_File_ID: null,
                                trashWorse: false
                            }
                        });
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="Alternates" onClick={() => {
                        updateFileComparisonsEvaluated({
                            ...fileComparisonsEvaluated.current,
                            [visibleIndex]: {
                                type: "alternates",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2
                            }
                        });
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="False positives" onClick={() => {
                        updateFileComparisonsEvaluated({
                            ...fileComparisonsEvaluated.current,
                            [visibleIndex]: {
                                type: "false-positive",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2
                            }
                        });
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="Skip" onClick={() => {
                        incrementIndex.out(1);
                        setActiveFile("File_1");
                    }} />
                    <input type="button" value="Go back" onClick={() => {
                        incrementIndex.out(-1);
                        setActiveFile("File_1");
                    }} />
                </div>
                <div style={{position: "absolute", bottom: "4px", right: "4px", flexDirection: "column"}}>
                    <input type="button" value="Commit" onClick={() => {
                        console.log(existingState);
                    }} />
                </div>

                {(VIDEO_FILE_EXTENSIONS.indexOf(realizedValue[activeFile].File_Extension) !== -1)
                ? <video id={VIDEO_ID} className="gallery-content" controls={true}>
                    <source src={src}></source>
                </video>
                : <img className="gallery-content" src={src} />
                }
            </div>
        }}
        customTitleRealizer={() => ""}
        valueRealizationDelay={50}
        valueRealizationRange={5}
        incrementIndexOut={incrementIndex}
        itemProperties={{
            width: "100%",
            height: "100%",
        }}
        scrollbarIncrement={1}
        scrollbarWidth={0}
        initialLastClickedIndex={initialFileComparisonIndex}
        elementsSelectable={false}
        allowScrollInput={false}
        allowKeyboardInput={false}
    />
};

export default LazyDedupeGallery;