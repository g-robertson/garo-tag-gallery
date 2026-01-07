import LazyDedupeGallery from '../../components/lazy-dedupe-gallery.jsx';
import '../../global.css';

/** @import {DBFileComparison} from '../../../db/duplicates.js' */

/** 
 * @param {{
 *  fileComparisons: DBFileComparison[]>
 *  initialFileComparisonIndex?: number
 *  persistentState?: any
 * }}
*/
export default function DedupeGalleryModal({ fileComparisons, initialFileComparisonIndex, persistentState }) {
    return {
        component: (
            <div style={{width: "100%", height: "100%"}}>
                <LazyDedupeGallery
                    fileComparisons={fileComparisons}
                    initialFileComparisonIndex={initialFileComparisonIndex}
                    persistentState={persistentState}
                />
            </div>
        ),
        displayName: "Dedupe Gallery",
        width: 100,
        height: 100,
        hasTopbar: false,
        hasBorder: false,
        moveWithIndex: 0
    };
};