import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';

import NumericInput from '../../components/numeric-input.jsx';
import HoverInfo from '../../components/hover-info.jsx';
import { ALT_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE, CURRENT_PERCEPTUAL_HASH_VERSION, DUP_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE, IS_EXACT_DUPLICATE_DISTANCE, MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE, REASONABLE_SIMILAR_PERCEPTUAL_HASH_DISTANCE, USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER } from '../../js/duplicates.js';
import compareFilesForDuplicates from '../../../api/client-get/compare-files-for-duplicates.js';
import LazyDedupePreviewGallery from '../../components/lazy-dedupe-preview-gallery.jsx';
import DedupeGalleryModal from '../../modal/modals/dedupe-gallery.jsx';
import DialogBox from '../../modal/modals/dialog-box.jsx';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';
import { Modals } from '../../modal/modals.js';
import { Jobs } from '../../jobs.js';
import { Page} from "../pages.js";
import { ConstState, PersistentState, State } from '../../js/state.js';
import { FetchCache } from '../../js/fetch-cache.js';
import { commitDedupeGalleryState, dedupeGalleryStateHasComparisons } from '../../components/lazy-dedupe-gallery.jsx';
import commitFileRelations from '../../../api/client-get/commit-file-relations.js';

/** @import {DBFileComparison} from "../../../db/duplicates.js" */
/** @import {SearchObject} from "../../components/tags-selector.jsx" */

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
 *  page: Page
 * }}
*/
const DuplicatesProcessingPage = ({page}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const TaggablesIncludedInDisplayCount = ReferenceableReact();
    const AlreadyProcessedFileCount = ReferenceableReact();
    const TotalFileCount = ReferenceableReact();
    const ExactDuplicateComparisonsMadeCount = ReferenceableReact();
    const ExactDuplicateFileCount = ReferenceableReact();
    const PotentialDuplicateComparisonsMadeCount = ReferenceableReact();
    const PotentialDuplicateFileCount = ReferenceableReact();

    const dedupeGalleryState = page.persistentState.registerState("dedupeGallery", new PersistentState(), {addToCleanup, name: "DuplicatesProcessingPage.dedupeGalleryState"});
    const maxSearchDistanceState = page.persistentState.registerState("maxSearchDistance", new State(REASONABLE_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER), {isSaved: true, addToCleanup, name: "DuplicatesProcessingPage.maxSearchDistanceState"});
    
    const clientSearchQueryState = new State(null, {name: "DuplicatesProcessingPage.clientSearchQueryState"});
    /** @type {State<number[]>} */
    const localTagServiceIDsState = new State([], {name: "DuplicatesProcessingPage.localTagServiceIDsState"});
    const searchTaggablesResultConstState = FetchCache.Global().searchTaggablesConstState(
        clientSearchQueryState,
        ConstState.instance("File"),
        ConstState.instance([]),
        localTagServiceIDsState,
        addToCleanup
    );
    const fileCursorConstState = searchTaggablesResultConstState.asTransform(taggablesResult => taggablesResult.cursor, addToCleanup, {name: "DuplicatesProcessingPage.fileCursorConstState"});
    const filesConstState = FetchCache.Global().reselectFilesConstState(
        fileCursorConstState,
        ConstState.instance(["Taggable_IDs", "File_ID", "File_Hash", "File_Extension", "Perceptual_Hash_Version"]),
        addToCleanup
    ).asTransform(mapToFiles, addToCleanup, {name: "DuplicatesProcessingPage.filesConstState"});

    const potentialDuplicateFileComparisonsConstState = FetchCache.Global().selectFileComparisonsConstState(
        fileCursorConstState,
        maxSearchDistanceState,
        addToCleanup
    );

    /** @type {State<number[]>} */
    const potentialDuplicateIndicesSelectedState = new State([], {name: "DuplicatesProcessingPage.potentialDuplicateIndicesSelectedState"});

    const potentialDuplicateFileComparisonsPendingConstState = potentialDuplicateFileComparisonsConstState.asTransform(potentialDuplicateFileComparisons => (
        potentialDuplicateFileComparisons
        .filter(fileComparison => !fileComparison.Comparison_Is_Checked)
        .sort((a, b) => a.Perceptual_Hash_Distance - b.Perceptual_Hash_Distance)
    ), addToCleanup, {name: "DuplicatesProcessingPage.potentialDuplicateFileComparisonsPendingConstState"});

    const onAdd = () => {
        const onFilesUpdated = () => {
            const files = filesConstState.get();

            /** @type {Set<number>} */
            const taggableIDs = new Set();
            let alreadyProcessedFileCount = 0;
            for (const file of files) {
                
                if (file.perceptualHashComparisonVersion === CURRENT_PERCEPTUAL_HASH_VERSION) {
                    ++alreadyProcessedFileCount;
                }
                for (const taggableID of file.taggableIDs) {
                    taggableIDs.add(taggableID);
                }
            }

            TaggablesIncludedInDisplayCount.dom.textContent = taggableIDs.size;
            AlreadyProcessedFileCount.dom.textContent = alreadyProcessedFileCount;
            TotalFileCount.dom.textContent = files.length;
        };

        const onPotentialDuplicatesUpdated = () => {
            let exactDuplicateFileCount = 0;
            let exactDuplicateComparisonsMade = 0;
            let potentialDuplicateComparisonsMadeCount = 0;
            let potentialDuplicateFileCount = 0;

            for (const fileComparison of potentialDuplicateFileComparisonsConstState.get()) {
                ++potentialDuplicateFileCount;
                if (fileComparison.Comparison_Is_Checked) {
                    ++potentialDuplicateComparisonsMadeCount;
                }
                if (fileComparison.Perceptual_Hash_Distance === IS_EXACT_DUPLICATE_DISTANCE) {
                    ++exactDuplicateFileCount;
                    if (fileComparison.Comparison_Is_Checked) {
                        ++exactDuplicateComparisonsMade;
                    }
                }
            }

            ExactDuplicateFileCount.dom.textContent = exactDuplicateFileCount;
            ExactDuplicateComparisonsMadeCount.dom.textContent = exactDuplicateComparisonsMade;
            PotentialDuplicateFileCount.dom.textContent = potentialDuplicateFileCount;
            PotentialDuplicateComparisonsMadeCount.dom.textContent = potentialDuplicateComparisonsMadeCount;
        };

        filesConstState.addOnUpdateCallback(onFilesUpdated, addToCleanup, {whenInvalidSubstitute: "no-update"});
        potentialDuplicateFileComparisonsConstState.addOnUpdateCallback(onPotentialDuplicatesUpdated, addToCleanup, {whenInvalidSubstitute: "no-update"});

        return () => executeFunctions(addToCleanup);
    };

    const openNewDedupeGallery = async () => {
        let fileComparisons = potentialDuplicateFileComparisonsPendingConstState.get();

        const fileComparisonIndices = potentialDuplicateIndicesSelectedState.get();
        if (fileComparisonIndices.length > 1) {
            fileComparisons = fileComparisonIndices.map(index => fileComparisons[index]);
        }
        if (dedupeGalleryStateHasComparisons(dedupeGalleryState)) {
            const REOPEN_BUTTON = 0;
            const DISCARD_BUTTON = 1;

            const optionSelected = await Modals.Global().pushModal(DialogBox({
                displayName: "Uncommitted Dedupe Gallery",
                promptText: "You have an active dedupe gallery that is uncommitted. What do you wish to do with this gallery?",
                optionButtons: [
                    {
                        value: REOPEN_BUTTON,
                        text: "Reopen"
                    },
                    {
                        value: DISCARD_BUTTON,
                        text: "Discard"
                    }
                ]
            }));
            if (optionSelected === REOPEN_BUTTON) {
                Modals.Global().pushModal(DedupeGalleryModal({
                    fileComparisons,
                    persistentState: dedupeGalleryState
                }));
                return;
            }
            if (optionSelected === DISCARD_BUTTON) {
                dedupeGalleryState.clear();
            } else {
                return;
            }
        }
        Modals.Global().pushModal(DedupeGalleryModal({
            fileComparisons,
            persistentState: dedupeGalleryState
        }));
    };

    return (
        <div onAdd={onAdd} style={{width: "100%", height: "100%"}}>
            <div style={{flexDirection: "column", height: "100%"}}>
                <div style={{marginRight: 16}}>Limit the files you will process duplicates of:</div>
                <div style={{height: "97%"}}>
                    <TagsSelector
                        taggableCursorConstState={fileCursorConstState}
                        onSearchChanged={(clientSearchQuery, localTagServiceIDs) => {
                            clientSearchQueryState.set(clientSearchQuery);
                            localTagServiceIDsState.set(localTagServiceIDs);
                        }}
                        persistentState={page.persistentState.registerState("tagsSelector", new PersistentState(), {addToCleanup})}
                    />
                </div>
            </div>
            <div style={{width: "auto", flex: 3, flexDirection: "column", height: "100%"}}>
                <div style={{marginTop: 4}}>
                    Maximum <HoverInfo hoverText={"A metric representing how different images are:\n"
                                                + `0-${DUP_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " will be near identical\n"
                                                + `${DUP_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}-${ALT_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " are almost certain to be alternates, but can also include duplicates\n"
                                                + `${ALT_LIKELY_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}-${REASONABLE_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " are probably going to be alternates of eachother, but can include false positives\n"
                                                + `${REASONABLE_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}-${MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER}`
                                                + " will almost always be just false positives\n"
                                                + `Maximum value allowed for input is ${MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER} as higher values would just cause lower performance for no more similar images`
                    }>search distance</HoverInfo> of pairs:
                    <div style={{marginLeft: 4}}>
                        <NumericInput className="duplicate-search-distance" selectedNumberState={maxSearchDistanceState} minValue={0} maxValue={MAX_SIMILAR_PERCEPTUAL_HASH_DISTANCE * USER_SIMILAR_PERCEPTUAL_HASH_MULTIPLIER} />
                    </div>
                </div>
                <div style={{marginTop: 4}}>Taggables included in query: {TaggablesIncludedInDisplayCount.react(<span></span>)}</div>
                <div style={{marginTop: 4}}>
                    Files from taggables that have been processed: {AlreadyProcessedFileCount.react(<span></span>)}/{TotalFileCount.react(<span></span>)}
                    <input type="button" value="Begin database processing files" style={{marginTop: -2}} onClick={async () => {
                        await compareFilesForDuplicates(fileCursorConstState.get());
                        await Jobs.refreshGlobal();
                    }} />
                </div>
                <div style={{marginTop: 4}}>
                    Exact pixel duplicates processed: {ExactDuplicateComparisonsMadeCount.react(<span></span>)}/{ExactDuplicateFileCount.react(<span></span>)}
                    <input type="button" value="Set all smaller exact pixel duplicates as better" style={{marginLeft: 4, marginTop: -2}} onClick={async () => {
                        const exactDuplicateFileComparisonsPending = potentialDuplicateFileComparisonsPendingConstState.get().filter(fileComparison => fileComparison.Perceptual_Hash_Distance === IS_EXACT_DUPLICATE_DISTANCE);
                        await commitFileRelations(exactDuplicateFileComparisonsPending.map(fileComparison => ({
                            type: "duplicates-with-same-quality-trash-larger",
                            File_ID_1: fileComparison.File_ID_1,
                            File_ID_2: fileComparison.File_ID_2
                        })));
                    }}/>
                </div>
                <div style={{marginTop: 4}}>
                    Potential duplicate pairs processed: {PotentialDuplicateComparisonsMadeCount.react(<span></span>)}/{PotentialDuplicateFileCount.react(<span className="total-potential-duplicate-pairs"></span>)}
                    <input type="button" value="Begin filtering potential duplicates" style={{marginLeft: 4, marginTop: -2}} onClick={() => {
                        openNewDedupeGallery();
                    }} />
                </div>
                <div style={{marginTop: 4}}>Preview of file pairs to dedupe:</div>
                <div style={{flex: 1}}>
                    <LazyDedupePreviewGallery
                        fileComparisonPairsConstState={potentialDuplicateFileComparisonsPendingConstState}
                        onValuesSelected={(_, indices) => {
                            potentialDuplicateIndicesSelectedState.set(indices);
                        }}
                        onValuesDoubleClicked={openNewDedupeGallery}
                    />
                </div>
            </div>
        </div>
    );
};

export default DuplicatesProcessingPage;
export const DUPLICATES_PROCESSING_PAGE_NAME = "duplicates-processing-page";
export const DUPLICATES_PROCESSING_PAGE_DEFAULT_DISPLAY_NAME = "New duplicates processing page";