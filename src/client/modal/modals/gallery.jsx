import '../../global.css';
import LazyGallery from '../../components/lazy-gallery.jsx';

/** 
 * @param {{
 *  taggableIDs: number[]
 *  initialTaggableIndex?: number
 * }}
*/
export default function GalleryModal({ taggableIDs, initialTaggableIndex }) {
    return {
        component: (
            <div style={{width: "100%", height: "100%"}}>
                <LazyGallery taggableIDs={taggableIDs} initialTaggableIndex={initialTaggableIndex} />
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