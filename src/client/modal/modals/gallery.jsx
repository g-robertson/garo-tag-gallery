import '../../global.css';
import LazyGallery from '../../components/lazy-gallery.jsx';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {Modal} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      taggableIDs: number[]
 *      initialTaggableIndex?: number
 *  }>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function GalleryModal({ extraProperties, modalResolve }) {
    const taggableIDs = extraProperties.taggableIDs;
    return {
        component: (
            <div style={{width: "100%", height: "100%"}}>
                <LazyGallery taggableIDs={taggableIDs} initialTaggableIndex={extraProperties?.initialTaggableIndex} />
            </div>
        ),
        displayName: "Gallery",
        width: 100,
        height: 100,
        hasTopbar: false,
        hasBorder: false,
        moveWithIndex: 0
    };
};