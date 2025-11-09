import LazyDedupeGallery from '../../components/lazy-dedupe-gallery.jsx';
import '../../global.css';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  modalOptions: ModalOptions
 * }}
*/
const DedupeGalleryModal = ({states, modalOptions}) => {
    return (
        <div style={{width: "100%", height: "100%"}}>
            <LazyDedupeGallery
                states={states}
                fileComparisons={modalOptions.extraProperties.fileComparisons}
                initialFileComparisonIndex={modalOptions?.extraProperties?.initialFileComparisonIndex}
                existingState={modalOptions.extraProperties.existingState}
                updateExistingStateProp={modalOptions.extraProperties.updateExistingStateProp}
                clearExistingStateProps={modalOptions.extraProperties.clearExistingStateProps}
            />
        </div>
    );
};

export default DedupeGalleryModal;

export const MODAL_PROPERTIES = {
    modalName: "dedupe-gallery",
    displayName: "Dedupe Gallery",
    width: 100,
    height: 100,
    hasTopbar: false,
    hasBorder: false,
    moveWithIndex: 0
};
export const DEDUPE_GALLERY_MODAL_PROPERTIES = MODAL_PROPERTIES;