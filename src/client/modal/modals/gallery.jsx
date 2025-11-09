import '../../global.css';
import LazyGallery from '../../components/lazy-gallery.jsx';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/** 
 * @param {{
 *  states: States
 *  modalOptions: ModalOptions
 * }}
*/
const GalleryModal = ({states, modalOptions}) => {
    const taggableIDs = modalOptions.extraProperties.taggableIDs;
    return (
        <div style={{width: "100%", height: "100%"}}>
            <LazyGallery states={states} taggableIDs={taggableIDs} initialTaggableIndex={modalOptions?.extraProperties?.initialTaggableIndex} />
        </div>
    );
};

export default GalleryModal;

export const MODAL_PROPERTIES = {
    modalName: "gallery",
    displayName: "Gallery",
    width: 100,
    height: 100,
    hasTopbar: false,
    hasBorder: false,
    moveWithIndex: 0
};
export const GALLERY_MODAL_PROPERTIES = MODAL_PROPERTIES;