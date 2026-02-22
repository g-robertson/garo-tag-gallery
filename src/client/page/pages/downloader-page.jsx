import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import LazyThumbnailGallery from '../../components/lazy-thumbnail-gallery.jsx';

import GalleryModal from '../../modal/modals/gallery.jsx';
import ModifyTaggablesModal from '../../modal/modals/modify-taggables.jsx';
import { trashTaggables } from '../../../api/client-get/trash-taggables.js';
import { Page} from "../pages.js";
import { PersistentState, State, ConstState } from '../../js/state.js';
import { Modals } from '../../modal/modals.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';
import { FetchCache } from '../../js/fetch-cache.js';
import { User } from '../../js/user.js';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import NumericInput from '../../components/numeric-input.jsx';
import AdjustableWidgets, { EXPANDABLE_EXPANSION_AREA, EXPANSION_AREA } from '../../components/adjustable-widgets.jsx';

/** 
 * @param {{
 *  page: Page
 * }}
*/
const DownloaderPageElement = ({page}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const URLClassMatched = ReferenceableReact();
    const ModifySelectedTaggablesButton = ReferenceableReact();
    const TrashSelectedTaggablesButton = ReferenceableReact();

    const fileCountLimitState = new State(2000);
    const selectedTaggableIDsState = new State([], {name: "FileSearchPage.selectedTaggableIDsState"});
    const clientSearchQueryState = new State(null, {name: "FileSearchPage.clientSearchQueryState"});
    const searchTaggablesResultState = FetchCache.Global().searchTaggablesConstState(
        clientSearchQueryState,
        ConstState.instance("Taggable"),
        ConstState.instance("Taggable_ID"),
        User.Global().localTagServicesAvailableState(addToCleanup),
        addToCleanup
    );
    const [taggableCursorConstState, taggableIDsConstState] = searchTaggablesResultState.asAtomicTransforms([
        taggablesResult => taggablesResult.cursor,
        taggablesResult => taggablesResult.result
    ], addToCleanup, {name: "FileSearchPage.(taggableCursorConstState|taggableIDsConstState)"});

    const onAdd = () => {
        const onSelectedTaggables = () => {
            const selectedTaggableIDs = selectedTaggableIDsState.get();
            ModifySelectedTaggablesButton.dom.disabled = selectedTaggableIDs.length === 0;
            TrashSelectedTaggablesButton.dom.disabled = selectedTaggableIDs.length === 0;
        };
        onSelectedTaggables();

        selectedTaggableIDsState.addOnUpdateCallback(onSelectedTaggables, addToCleanup);
        return () => executeFunctions(addToCleanup);
    };

    return (
        <div style={{width: "100%", height: "100%"}} onAdd={onAdd}>
            <div style={{flex: 1, height: "100%", }}>
                <div style={{margin: 4, flexDirection: "column"}}>
                    <AdjustableWidgets
                        persistentState={page.persistentState.registerState("adjustableWidgets", new PersistentState(), {addToCleanup})}
                        flexDirection="column"
                        widgets={[
                            {
                                element: (<div style={{flexDirection: "column", marginBottom: 4}}>
                                    <div style={{marginTop: 4}}>Enter a URL: <input style={{marginLeft: 4}} type="text" /></div>
                                    <div style={{marginTop: 4}}>Or use a URL generator: <input style={{marginLeft: 4}} type="button" value="Generate URL" /></div>
                                    <div style={{marginTop: 4}}>URL Classifier matched: {URLClassMatched.react(<span style={{marginLeft: 2, color: "red"}}>No URL classifier matched</span>)}</div>
                                    <div style={{marginTop: 2, borderBottom: "1px solid white"}}></div>
                                    <div style={{marginTop: 4}}><input type="button" value="Download from URL" /><input style={{marginLeft: 4}} type="button" value="Watch URL" /></div>
                                </div>),
                                defaultFlex: 0
                            },
                            {
                                element: (<LazyTextObjectSelector
                                    textObjectsConstState={ConstState.instance(["downloader1 - 123 items - Done", "downloader2 - 123 items - Done", "downloader3 - 123 items - Done"])}
                                    customItemComponent={({realizedValue}) => <>{realizedValue}</>}
                                    multiSelect={false}
                                />),
                                defaultFlex: 1,
                                minFlex: 0.7
                            },
                            EXPANSION_AREA,
                            {
                                element: (<div style={{flexDirection: "column"}}>
                                    <div style={{marginTop: 4}}>File count limit: <span style={{marginLeft: 4}}><NumericInput selectedNumberState={fileCountLimitState} minValue={1} maxValue={Infinity} /></span></div>
                                    <div style={{marginTop: 4}}><input type="button" value="View selected query's log" /></div>
                                    <div style={{marginTop: 4}}><input type="button" value="Retry selected query's failed items" /></div>
                                </div>),
                                defaultFlex: 0
                            }
                        ]}
                        defaultAfterFlex={4}
                    />
                </div>
            </div>
            <div style={{width: "auto", flex: 3, flexDirection: "column", height: "100%"}}>
                <div>
                    {ModifySelectedTaggablesButton.react(<input type="button" value="Modify selected taggables" onClick={() => {
                        Modals.Global().pushModal(ModifyTaggablesModal({
                            taggableCursorConstState,
                            taggableIDsConstState: selectedTaggableIDsState.asConst(),
                        }));
                    }} />)}
                    {TrashSelectedTaggablesButton.react(<input type="button" value="Trash selected taggables" onClick={() => {
                        const confirm = window.confirm("Are you sure you want to trash these taggables, they will be sent to trash can where they can either be restored or deleted permanently.");
                        if (!confirm) {
                            return;
                        }

                        trashTaggables(selectedTaggableIDsState.get());
                    }} />)}
                </div>
                <div style={{flex: 1}}>
                    <LazyThumbnailGallery
                        taggableIDsConstState={taggableIDsConstState}
                        onValuesSelected={(_, indices) => {
                            selectedTaggableIDsState.set(indices.map(index => taggableIDsConstState.get()[index]));
                        }}
                        onValuesDoubleClicked={(_, indices, indexClicked) => {
                            const taggableIDs = taggableIDsConstState.get();
                            if (indices.length > 1) {
                                const indicesSet = new Set(indices);
                                const taggableIDsToShow = taggableIDs.filter((_, index) => indicesSet.has(index));
                                const initialTaggableIndex = taggableIDsToShow.findIndex(taggable => taggable === taggableIDs[indexClicked]);

                                Modals.Global().pushModal(GalleryModal({
                                    taggableIDs: taggableIDsToShow,
                                    initialTaggableIndex
                                }));
                            } else if (indices.length === 1) {
                                Modals.Global().pushModal(GalleryModal({
                                    taggableIDs: taggableIDs,
                                    initialTaggableIndex: indexClicked
                                }));
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DownloaderPageElement;
export const DOWNLOADER_PAGE_NAME = "downloader-page";
export const DOWNLOADER_PAGE_DEFAULT_DISPLAY_NAME = "New downloader page";