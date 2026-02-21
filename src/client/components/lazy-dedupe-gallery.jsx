import '../global.css';
import { executeFunctions, ReferenceableReact, TransitiveRelationGroups, VIDEO_FILE_EXTENSIONS } from '../js/client-util.js';
import LazySelector from './lazy-selector.jsx';
import selectFiles from '../../api/client-get/select-files.js';
import { ConstState, PersistentState, State } from "../js/state.js";
import { Modals } from '../modal/modals.js';
import { ImagePreloader } from '../js/client-exclusive-util.js';
import DialogBox, { YES_BUTTON, YES_NO_BUTTONS } from '../modal/modals/dialog-box.jsx';
import commitFileRelations from '../../api/client-get/commit-file-relations.js';
import { getFileRelationsFiles, isFileRelationDuplicate } from '../js/duplicates.js';

/** @import {DBFileComparison} from "../../db/duplicates.js" */
/** @import {DBFile} from "../../db/taggables.js" */
/** @import {FileRelation} from "../../api/zod-types.js" */

/**
 * @typedef {{
 *     File_1: DBFile
 *     File_2: DBFile
 * } & DBFileComparison} LazyDedupeGalleryRealizedValue
 **/

/**
 * @param {PersistentState} persistentState 
 */
export function dedupeGalleryStateHasComparisons(persistentState) {
    if (persistentState.isClear()) {
        return false;
    }

    return Object.keys(persistentState.getVal("fileComparisonsEvaluated")).length !== 0;
}

/**
 * @param {PersistentState} persistentState 
 */
export async function commitDedupeGalleryState(persistentState) {
    const fileComparisonsEvaluated = persistentState.getVal("fileComparisonsEvaluated");
    await commitFileRelations(Object.values(fileComparisonsEvaluated));
    persistentState.clear();
}

/**
 * @param {{
 *  fileComparisons: DBFileComparison[]
 *  initialFileComparisonIndex?: number
 *  persistentState: PersistentState
 * }} param0
 */
const LazyDedupeGallery = ({fileComparisons, initialFileComparisonIndex, persistentState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const ActiveFile = ReferenceableReact();
    const imagePreloader = new ImagePreloader();

    const visibleIndexState = persistentState.registerState("visibleIndex", new State(initialFileComparisonIndex ?? 0), {isSaved: true, addToCleanup, name: "LazyDedupeGallery.visibleIndexState"});
    /** @type {State<Record<number, FileRelation>>} */
    const fileComparisonsEvaluatedState = persistentState.registerState("fileComparisonsEvaluated", new State({}), {isSaved: true, addToCleanup, name: "LazyDedupeGallery.fileComparisonsEvaluatedState"});

    const selectorIncrementerState = new State(0, {name: "LazyDedupeGallery.selectorIncrementerState"});
    /** @type {State<LazyDedupeGalleryRealizedValue>} */
    const realizedValueState = new State(null, {name: "LazyDedupeGallery.realizedValueState"});

    /** @type {State<"File_1" | "File_2">} */
    const activeFileState = new State("File_1", {name: "LazyDedupeGallery.activeFileState"});

    const onAdd = () => {
        const onActiveFileChanged = () => {
            const activeFile = realizedValueState.get()?.[activeFileState.get()];
            const src = `images-database/${activeFile.File_Hash.slice(0, 2)}/${activeFile.File_Hash.slice(2, 4)}/${activeFile.File_Hash}${activeFile.File_Extension}`;
            if (activeFile === undefined || ActiveFile.dom === null) {
                return;
            }

            ActiveFile.dom.replaceChildren(
                VIDEO_FILE_EXTENSIONS.has(activeFile.File_Extension)
                ? <video dom className="gallery-content" controls={true}>
                    <source src={src}></source>
                </video>
                : <img dom className="gallery-content" src={src} />
            );
        };

        activeFileState.addOnUpdateCallback(onActiveFileChanged, addToCleanup);
        realizedValueState.addOnUpdateCallback(onActiveFileChanged, addToCleanup);

        const toggleActiveFile = () => {
            if (activeFileState.get() === "File_1") {
                activeFileState.set("File_2");
            } else {
                activeFileState.set("File_1");
            }
        }

        const onKeyDown = (e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowRight") {
                toggleActiveFile();
            }
        }
        const onWheel = (e) => {
            toggleActiveFile();
        }

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("wheel", onWheel);

        addToCleanup.push(() => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("wheel", onWheel);
        });

        return () => executeFunctions(addToCleanup);
    };

    /** @type {TransitiveRelationGroups<number>} */
    const transitiveDuplicateRelationGroups = new TransitiveRelationGroups();
    
    /**
     * @param {number} index
     * @param {FileRelation} relation
     */
    const addRelation = (index, relation) => {
        const fileComparisonsEvaluated = fileComparisonsEvaluatedState.get();
        const existingRelation = fileComparisonsEvaluated[index];
        if (existingRelation !== undefined && isFileRelationDuplicate(existingRelation)) {
            const fileIDs = getFileRelationsFiles(existingRelation);
            transitiveDuplicateRelationGroups.removeRelation(fileIDs[0], fileIDs[1]);
        }
        if (isFileRelationDuplicate(relation)) {
            const fileIDs = getFileRelationsFiles(relation);
            transitiveDuplicateRelationGroups.addRelation(fileIDs[0], fileIDs[1]);
        }

        fileComparisonsEvaluated[index] = relation;
        // no forceUpdate, moveToNextNonImpliedComparison will update it
    };

    /**
     * @param {number} index 
     */
    const isComparisonImplied = (index) => {
        const comparison = fileComparisons[index];
        return transitiveDuplicateRelationGroups.hasRelation(comparison.File_ID_1, comparison.File_ID_2);
    }

    const moveToNextNonImpliedComparison = () => {
        const fileComparisonsEvaluated = fileComparisonsEvaluatedState.get();
        const visibleIndex = visibleIndexState.get()
        let increment = 1;
        while(visibleIndex + increment < fileComparisons.length && isComparisonImplied(visibleIndex + increment)) {
            fileComparisonsEvaluated[visibleIndex + increment] = {type: "implied"};
            ++increment;
        }

        fileComparisonsEvaluatedState.forceUpdate();
        selectorIncrementerState.set(increment);
        activeFileState.set("File_1");
    };

    return <div onAdd={onAdd} style={{width: "100%", height: "100%"}}>
        {imagePreloader.reactElement()}
        <LazySelector
            valuesConstState={ConstState.instance(fileComparisons)}
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
            
                return values.map(value => ({
                    ...value,
                    File_1: fileMap.get(value.File_ID_1),
                    File_2: fileMap.get(value.File_ID_2)
                }));
            }}
            onValuesRangeRealized={async (realizedValues) => {
                const preloadImages = [];
                for (const {File_1, File_2} of realizedValues) {
                    preloadImages.push(`images-database/${File_1.File_Hash.slice(0, 2)}/${File_1.File_Hash.slice(2, 4)}/${File_1.File_Hash}${File_1.File_Extension}`);
                    preloadImages.push(`images-database/${File_2.File_Hash.slice(0, 2)}/${File_2.File_Hash.slice(2, 4)}/${File_2.File_Hash}${File_2.File_Extension}`);
                }

                imagePreloader.setPreload(preloadImages);
            }}
            onSelectedPastEnd={async () => {
                const OPTION_COMMIT_CHANGES = 1;
                const OPTION_GO_BACK = 2;

                const optionSelected = await Modals.Global().pushModal(DialogBox({
                    displayName: "Commit changes",
                    promptText: "You have finished processing the selected duplicates, select commit to commit your selections",
                    optionButtons: [
                        {text: "Commit", value: OPTION_COMMIT_CHANGES},
                        {text: "Go Back", value: OPTION_GO_BACK},
                    ]
                }));

                if (optionSelected === OPTION_COMMIT_CHANGES) {
                    await commitDedupeGalleryState(persistentState);
                    Modals.Global().popModal();
                }
            }}
            customItemComponent={({realizedValue, index}) => {
                const addToCleanupCIC = [];
                const ComparisonsMadeCount = ReferenceableReact();

                visibleIndexState.set(index);
                const fileComparisonsEvaluated = fileComparisonsEvaluatedState.get();
            
                return <div onAdd={() => {
                    realizedValueState.set(realizedValue);

                    const onFileComparisonsEvaluatedUpdate = () => {
                        ComparisonsMadeCount.dom.textContent = Object.keys(fileComparisonsEvaluatedState.get()).length
                    };

                    fileComparisonsEvaluatedState.addOnUpdateCallback(onFileComparisonsEvaluatedUpdate, addToCleanupCIC);

                    return () => executeFunctions(addToCleanupCIC);
                }} style={{width: "100%", height: "100%", justifyContent: "center"}}>
                    <div style={{position: "absolute", bottom: "20px", left: "4px"}}>
                        <span className="dedupe-gallery-current-file-index">{index + 1}</span>/{fileComparisons.length}
                    </div>
                    <div style={{position: "absolute", bottom: "4px", left: "4px"}}>
                        Comparisons made: {ComparisonsMadeCount.react(<span className="dedupe-gallery-evaluated-file-comparisons">{Object.keys(fileComparisonsEvaluated).length}</span>)}/<span className="dedupe-gallery-total-file-comparisons">{fileComparisons.length}</span>
                    </div>
                    <div style={{position: "absolute", top: "3vh", right: "4px", flexDirection: "column"}}>
                        <input type="button" value="Current is better, trash other" onClick={() => {
                            const Better_File_ID = realizedValue[activeFileState.get()].File_ID;
                            addRelation(index, {
                                type: "duplicates-with-better-trash-worse",
                                Better_File_ID,
                                Worse_File_ID: realizedValue.File_ID_1 === Better_File_ID ? realizedValue.File_ID_2 : realizedValue.File_ID_1
                            });
                            moveToNextNonImpliedComparison();
                        }} />
                        <input type="button" value="Current is better" onClick={() => {
                            const Better_File_ID = realizedValue[activeFileState.get()].File_ID;
                            addRelation(index, {
                                type: "duplicates-with-better",
                                Better_File_ID,
                                Worse_File_ID: realizedValue.File_ID_1 === Better_File_ID ? realizedValue.File_ID_2 : realizedValue.File_ID_1
                            });
                            moveToNextNonImpliedComparison();
                        }} />
                        <input type="button" value="Same quality, trash larger" onClick={() => {
                            addRelation(index, {
                                type: "duplicates-with-same-quality-trash-larger",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2
                            });
                            moveToNextNonImpliedComparison();
                        }} />
                        <input type="button" value="Same quality" onClick={() => {
                            addRelation(index, {
                                type: "duplicates-with-same-quality",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2
                            });
                            moveToNextNonImpliedComparison();
                        }} />
                        <input type="button" value="Alternates" onClick={() => {
                            addRelation(index, {
                                type: "alternates",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2
                            });
                            moveToNextNonImpliedComparison();
                        }} />
                        <input type="button" value="False positives" onClick={() => {
                            addRelation(index, {
                                type: "false-positives",
                                File_ID_1: realizedValue.File_ID_1,
                                File_ID_2: realizedValue.File_ID_2
                            });
                            moveToNextNonImpliedComparison();
                        }} />
                        <input type="button" value="Skip" onClick={() => {
                            selectorIncrementerState.set(1);
                            activeFileState.set("File_1");
                        }} />
                        <input type="button" value="Go back" onClick={() => {
                            selectorIncrementerState.set(-1);
                            activeFileState.set("File_1");
                        }} />
                    </div>
                    
                    {ActiveFile.react(<div></div>)}
                </div>
            }}
            customTitleRealizer={() => ""}
            valueRealizationDelay={50}
            valueRealizationRange={3}
            externalIncrementerConstState={selectorIncrementerState.asConst()}
            itemProperties={{
                width: "100%",
                height: "100%",
            }}
            scrollbarIncrement={1}
            scrollbarWidth={0}
            initialLastClickedIndex={visibleIndexState.get()}
            elementsSelectable={false}
            allowScrollInput={false}
            allowKeyboardInput={false}
        />
    
        <div style={{position: "absolute", bottom: "4px", right: "4px", flexDirection: "column"}}>
            <input type="button" value="Commit" onClick={async () => {
                await commitDedupeGalleryState(persistentState);
                Modals.Global().popModal();
            }} />
            <input type="button" value="Discard ALL changes" onClick={async () => {
                const optionSelected = await Modals.Global().pushModal(DialogBox({
                    displayName: "WARNING: Discard ALL Changes?",
                    promptText: "WARNING: Are you sure you want to discard all of your file relations from this session?",
                    optionButtons: YES_NO_BUTTONS
                }));
                if (optionSelected === YES_BUTTON.value) {
                    persistentState.clear();
                    Modals.Global().popModal();
                }
            }} />
        </div>
    </div>
};

export default LazyDedupeGallery;