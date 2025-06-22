import '../../global.css';
import { User } from '../js/user.js';
import LazyGallery from '../../components/lazy-gallery.jsx';

/** @import {ModalOptions} from "../modal.jsx" */

/** 
 * @param {{
 *  user: User
 *  modalOptions: ModalOptions
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * }}
*/
const GalleryModal = ({user, modalOptions, pushModal, popModal}) => {
    const taggableIDs = modalOptions.extraProperties.taggableIDs;
    let initialTaggableID = modalOptions?.extraProperties?.initialTaggableID;
    initialTaggableID ??= taggableIDs[0];
    return (
        <div style={{width: "100%", height: "100%"}}>
            <LazyGallery user={user} taggableIDs={taggableIDs} initialTaggableID={initialTaggableID} />
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