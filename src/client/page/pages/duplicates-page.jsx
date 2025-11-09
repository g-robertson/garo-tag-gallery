import { useEffect, useRef, useState } from 'react';
import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';

import { searchTaggables } from '../../../api/client-get/search-taggables.js';
import NumericInput from '../../components/numeric-input.jsx';
import HoverInfo from '../../components/hover-info.jsx';
import { ALT_LIKELY_PERCEPTUAL_HASH_DISTANCE, COMPARE_FILES_FOR_DUPLICATE_JOB_TYPE, CURRENT_PERCEPTUAL_HASH_VERSION, DUP_LIKELY_PERCEPTUAL_HASH_DISTANCE, IS_EXACT_DUPLICATE_DISTANCE, MAX_PERCEPTUAL_HASH_DISTANCE, REASONABLE_PERCEPTUAL_HASH_DISTANCE, USER_PERCEPTUAL_HASH_MULTIPLIER } from '../../js/duplicates.js';
import selectFileComparisons from '../../../api/client-get/select-file-comparisons.js';
import compareFilesForDuplicates from '../../../api/client-get/compare-files-for-duplicates.js';
import getActiveJobs from '../../../api/client-get/active-jobs.js';
import reselectFiles from '../../../api/client-get/reselect-files.js';
import LazyDedupePreviewGallery from '../../components/lazy-dedupe-preview-gallery.jsx';
import { DEDUPE_GALLERY_MODAL_PROPERTIES } from '../../modal/modals/dedupe-gallery.jsx';
import { DIALOG_BOX_MODAL_PROPERTIES } from '../../modal/modals/dialog-box.jsx';
import { mergeGroups } from '../../js/client-util.js';

/** @import {DBFileComparison} from "../../../db/duplicates.js" */
/** @import {SearchObject} from "../../components/tags-selector.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/**
 * @typedef {Object} ClientFile
 * @property {number[]} taggableIDs
 * @property {number} fileID
 * @property {string} fileHash
 * @property {string} fileExtension
 * @property {number | null} perceptualHashComparisonVersion
 */

/**
 * @param {any[]} searchResult 
 * @returns {ClientFile[]}
 */
function mapToFiles(searchResult) {
    const files = searchResult.map(row => ({
        taggableIDs: row[0],
        fileID: row[1],
        fileHash: row[2],
        fileExtension: row[3],
        perceptualHashComparisonVersion: row[4]
    }));

    return files;
}

/** 
 * @param {{
 *  states: States
 *  setters: Setters
 *  existingState: any
 *  updateExistingStateProp: (key: string, value: any) => void
 * }}
*/
const DuplicatesProcessingPage = ({states, setters, existingState, updateExistingStateProp}) => {
    existingState ??= {};
    existingState.tagsSelector ??= {};
    existingState.dedupeGallery ??= {};
    updateExistingStateProp ??= () => {};

    const defaultMaxSearchDistance = existingState?.maxSearchDistance ?? (REASONABLE_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER);
    /** @type {[number, (maxSearchDistance: number) => void]} */
    const [maxSearchDistance, setMaxSearchDistance] = useState(defaultMaxSearchDistance);
    useEffect(() => {updateExistingStateProp("maxSearchDistance", maxSearchDistance);}, [maxSearchDistance]);
    const [fileCursor, setFileCursor] = useState();
    /** @type {[ClientFile[], (files: ClientFile[]) => void]} */
    const [files, setFiles] = useState([]);
    const filesMap = new Map(files.map(file => [file.fileID, file]));
    /** @type {[DBFileComparison[], (potentialDuplicateFileComparisons: DBFileComparison[]) => void]} */
    const [potentialDuplicateFileComparisons, setPotentialDuplicateFileComparisons] = useState([]);
    const alreadyProcessedFiles = files.filter(file => file.perceptualHashComparisonVersion === CURRENT_PERCEPTUAL_HASH_VERSION);
    const taggableIDs = files.flatMap(file => file.taggableIDs);

    const exactDuplicateFileComparisons = potentialDuplicateFileComparisons.filter(fileComparison => fileComparison.Perceptual_Hash_Distance === IS_EXACT_DUPLICATE_DISTANCE);
    const exactDuplicateFileComparisonsPending = exactDuplicateFileComparisons.filter(fileComparison => !fileComparison.Comparison_Is_Checked);
    const exactDuplicateFileComparisonsMade = exactDuplicateFileComparisons.filter(fileComparison => fileComparison.Comparison_Is_Checked);
    const potentialDuplicateFileComparisonsPending = potentialDuplicateFileComparisons.filter(fileComparison => !fileComparison.Comparison_Is_Checked).sort((a, b) => a.Perceptual_Hash_Distance - b.Perceptual_Hash_Distance);
    const potentialDuplicateFileComparisonsMade = potentialDuplicateFileComparisons.filter(fileComparison => fileComparison.Comparison_Is_Checked);

    const potentialDuplicateFileComparisonsPendingMergedGroups = mergeGroups(potentialDuplicateFileComparisonsPending, fileComparisonPending => [fileComparisonPending.File_ID_1, fileComparisonPending.File_ID_2]);
    const MAX_SUBGROUP_SIZE = 5;
    const potentialDuplicateFileComparisonsPendingSubgroups = potentialDuplicateFileComparisonsPendingMergedGroups.flatMap(group => {
        /** @type {{constituents: DBFileComparison[], fileIDs: Set<number>}[]} */
        const subgroups = [];
        let currentSubgroup = [];
        let currentSubgroupFileIDs = new Set();
        for (const constituent of group.constituents) {
            if (!currentSubgroupFileIDs.has(constituent.File_ID_1) || !currentSubgroupFileIDs.has(constituent.File_ID_2)) {
                currentSubgroup.push(constituent);
                currentSubgroupFileIDs.add(constituent.File_ID_1);
                currentSubgroupFileIDs.add(constituent.File_ID_2);

                if (currentSubgroupFileIDs.size >= MAX_SUBGROUP_SIZE) {
                    subgroups.push({
                        constituents: currentSubgroup,
                        fileIDs: currentSubgroupFileIDs
                    });
                }
            }
        }
    })
    const previousSearch = useRef(null);

    const activeDedupingInterval = useRef(null);
    const refreshFileComparisons = useRef(() => {});
    refreshFileComparisons.current = async () => {
        reselectFiles(fileCursor, ["Taggable_ID", "File_ID", "File_Hash", "File_Extension", "Perceptual_Hash_Version"]).then(files => setFiles(mapToFiles(files)));
        selectFileComparisons(fileCursor, maxSearchDistance, states.fetchCache, true).then(fileComparisons => setPotentialDuplicateFileComparisons(fileComparisons));
    }
    useEffect(() => {
        let dedupingJobExists = false;
        for (const job of states.activeJobs) {
            if (job.jobType === COMPARE_FILES_FOR_DUPLICATE_JOB_TYPE) {
                dedupingJobExists = true;
            }
        }

        if (!dedupingJobExists) {
            clearInterval(activeDedupingInterval.current);
            activeDedupingInterval.current = null;
        } else if (activeDedupingInterval.current === null) {
            activeDedupingInterval.current = setInterval(() => {
                refreshFileComparisons.current();
            }, 1000);
        }
    }, [states.activeJobs, fileCursor]);

    useEffect(() => {
        if (fileCursor === undefined) {
            return;
        }

        refreshFileComparisons.current();
    }, [fileCursor, maxSearchDistance]);

    const makeSearch = async (forceNoCache) => {
        forceNoCache ??= false;

        const result = await searchTaggables(
            previousSearch.current.clientSearchQuery,
            "File",
            ["Taggable_ID", "File_ID", "File_Hash", "File_Extension", "Perceptual_Hash_Version"],
            previousSearch.current.localTagServiceIDs,
            states.fetchCache,
            forceNoCache
        );
        setFileCursor(result.cursor);
        setFiles(mapToFiles(result.result));

        return result.cursor;
    }

    useEffect(() => {
        if (previousSearch.current !== null) {
            makeSearch();
        }
    }, [states.fetchCache])

    existingState.dedupeGallery ??= {};
    const openNewDedupeGallery = useRef(async (fileComparisons, initialFileComparisonIndex) => {});
    openNewDedupeGallery.current = async (fileComparisons, initialFileComparisonIndex) => {
        if (existingState.dedupeGallery.fileComparisonsEvaluated !== undefined) {
            const REOPEN_BUTTON = 0;
            const COMMIT_BUTTON = 1;
            const DISCARD_BUTTON = 2;

            const optionSelected = await setters.pushModal(DIALOG_BOX_MODAL_PROPERTIES.modalName, {
                promptText: "You have an active dedupe gallery that is uncommitted. What do you wish to do with this gallery?",
                optionButtons: [
                    {
                        value: REOPEN_BUTTON,
                        text: "Reopen"
                    },
                    {
                        value: COMMIT_BUTTON,
                        text: "Commit"
                    },
                    {
                        value: DISCARD_BUTTON,
                        text: "Discard"
                    }
                ]
            });
            if (optionSelected === REOPEN_BUTTON) {
                setters.pushModal(DEDUPE_GALLERY_MODAL_PROPERTIES.modalName, {
                    existingState: existingState.dedupeGallery,
                    clearExistingStateProps: () => {
                        existingState.dedupeGallery = {};
                        updateExistingStateProp("dedupeGallery", existingState.dedupeGallery);
                    },
                    updateExistingStateProp: (key, value) => {
                        existingState.dedupeGallery[key] = value;
                        updateExistingStateProp("dedupeGallery", existingState.dedupeGallery);
                    }
                });
                return;
            }
            if (optionSelected === COMMIT_BUTTON) {

                //existingState.dedupeGallery = {};
                //updateExistingStateProp("dedupeGallery", existingState.dedupeGallery);
            } else if (optionSelected === DISCARD_BUTTON) {
                existingState.dedupeGallery = {};
                updateExistingStateProp("dedupeGallery", existingState.dedupeGallery);
            } else {
                return;
            }
        }
        setters.pushModal(DEDUPE_GALLERY_MODAL_PROPERTIES.modalName, {
            fileComparisons,
            initialFileComparisonIndex,
            existingState: existingState.dedupeGallery,
            clearExistingStateProps: () => {
                existingState.dedupeGallery = {};
                updateExistingStateProp("dedupeGallery", existingState.dedupeGallery);
            },
            updateExistingStateProp: (key, value) => {
                existingState.dedupeGallery[key] = value;
                updateExistingStateProp("dedupeGallery", existingState.dedupeGallery);
            }
        });
    };

    return (
        <div style={{width: "100%", height: "100%"}}>
            <div style={{flexDirection: "column", height: "100%"}}>
                <div style={{marginRight: 16}}>Limit the files you will process duplicates of:</div>
                <div style={{height: "97%"}}>
                    <TagsSelector
                        states={states}
                        setters={setters}
                        taggableCursor={fileCursor}
                        onSearchChanged={async (clientSearchQuery, localTagServiceIDs) => {
                            previousSearch.current = {
                                clientSearchQuery,
                                localTagServiceIDs
                            };
                            makeSearch();
                        }}

                        existingState={existingState.tagsSelector}
                        updateExistingStateProp={(key, value) => {
                            existingState.tagsSelector[key] = value;
                            updateExistingStateProp("tagsSelector", existingState.tagsSelector);
                        }}
                    />
                </div>
            </div>
            <div style={{width: "auto", flex: 3, flexDirection: "column", height: "100%"}}>
                <div style={{marginTop: 4}}>
                    Maximum <HoverInfo hoverText={"A metric representing how different images are:\n"
                                                + `0-${DUP_LIKELY_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " will be near identical\n"
                                                + `${DUP_LIKELY_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}-${ALT_LIKELY_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " are almost certain to be alternates, but can also include duplicates\n"
                                                + `${ALT_LIKELY_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}-${REASONABLE_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " are probably going to be alternates of eachother, but can include false positives\n"
                                                + `${REASONABLE_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}-${MAX_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " will almost always be just false positives\n"
                                                + `Maximum value allowed for input is ${MAX_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER} as higher values would just cause lower performance for no more similar images`
                    }>search distance</HoverInfo> of pairs:
                    <div style={{marginLeft: 4}}><NumericInput minValue={0} maxValue={MAX_PERCEPTUAL_HASH_DISTANCE * USER_PERCEPTUAL_HASH_MULTIPLIER} defaultValue={defaultMaxSearchDistance} onChange={(num) => {
                        setMaxSearchDistance(num);
                    }} /></div></div>
                <div style={{marginTop: 4}}>Taggables included in query: {taggableIDs.length}</div>
                <div style={{marginTop: 4}}>
                    Files from taggables that have been processed: {alreadyProcessedFiles.length}/{files.length}
                    <input type="button" value="Begin database processing files" style={{marginTop: -2}} onClick={async () => {
                        let createdJob = await compareFilesForDuplicates(fileCursor);
                        if (!createdJob) {
                            const newFileCursor = await makeSearch(true);
                            createdJob = await compareFilesForDuplicates(newFileCursor);
                        }

                        if (createdJob) {
                            setters.setActiveJobs(await getActiveJobs());
                        }
                    }} />
                </div>
                <div style={{marginTop: 4}}>
                    Exact pixel duplicates processed: {exactDuplicateFileComparisonsMade.length}/{exactDuplicateFileComparisons.length}
                    <input type="button" value="Set all smaller exact pixel duplicates as better" style={{marginLeft: 4, marginTop: -2}} />
                </div>
                <div style={{marginTop: 4}}>
                    Potential duplicate pairs processed: {potentialDuplicateFileComparisonsMade.length}/{potentialDuplicateFileComparisons.length}
                    <input type="button" value="Begin filtering potential duplicates" style={{marginLeft: 4, marginTop: -2}} onClick={() => {
                        openNewDedupeGallery.current(potentialDuplicateFileComparisonsPending, 0);
                    }} />
                </div>
                <div style={{marginTop: 4}}>Preview of file pairs to dedupe:</div>
                <div style={{flex: 1}}>
                    <LazyDedupePreviewGallery
                        states={states}
                        fileComparisonPairs={potentialDuplicateFileComparisonsPendingGroups.flatMap(group => group.constituents.sort((a, b) => a.Perceptual_Hash_Distance - b.Perceptual_Hash_Distance))}
                        onValuesDoubleClicked={(_, indices, indexClicked) => {
                            if (indices.length > 1) {
                                openNewDedupeGallery.current(indices.map(index => potentialDuplicateFileComparisonsPending[index]), 0);
                            } else if (indices.length === 1) {
                                openNewDedupeGallery.current(potentialDuplicateFileComparisonsPending, indexClicked);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DuplicatesProcessingPage;

export const PAGE_NAME = "duplicates-processing-page";
export const DUPLICATES_PROCESSING_PAGE_NAME = PAGE_NAME;
export const PAGE_DEFAULT_DISPLAY_NAME = "New duplicates processing page";
export const DUPLICATES_PROCESSING_PAGE_DEFAULT_DISPLAY_NAME = PAGE_DEFAULT_DISPLAY_NAME;