import { trashTaggables } from '../../api/client-get/trash-taggables.js';
import '../global.css';
import { executeFunctions, ReferenceableReact } from '../js/client-util.js';
import { ConstState, State } from '../js/state.js';
import { Modals } from '../modal/modals.js';
import GalleryModal from '../modal/modals/gallery.jsx';
import ModifyTaggablesModal from '../modal/modals/modify-taggables.jsx';
import LazyThumbnailGallery from './lazy-thumbnail-gallery.jsx';

/** @import {DBUserFacingTaggableFile} from "../../db/taggables.js" */

/**
 * @param {{
 *  taggableCursorConstState: ConstState<string>
 *  taggableIDsConstState: ConstState<number[]>
 * }} param0
 */
const OptionedLazyThumbnailGallery = ({taggableCursorConstState, taggableIDsConstState}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const ModifySelectedTaggablesButton = ReferenceableReact();
    const TrashSelectedTaggablesButton = ReferenceableReact();
    
    /** @type {State<number[]>} */
    const selectedTaggableIDsState = new State([], {name: "OptionedLazyThumbnailGallery.selectedTaggableIDsState"});

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
        <div onAdd={onAdd} style={{width: "100%", flexDirection: "column", height: "100%"}}>
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
                    onValuesHighlighted={(_, indices) => {
                        selectedTaggableIDsState.set(indices.map(index => taggableIDsConstState.get()[index]));
                    }}
                    onValuesSelected={(_, indices, indexClicked) => {
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
    );
};

export default OptionedLazyThumbnailGallery;