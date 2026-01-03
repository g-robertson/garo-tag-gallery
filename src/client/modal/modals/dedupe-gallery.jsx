import LazyDedupeGallery from '../../components/lazy-dedupe-gallery.jsx';
import '../../global.css';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {Modal} from "../modals.js" */
/** @import {DBFileComparison} from '../../../db/duplicates.js' */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      fileComparisons: DBFileComparison[]>
 *      initialFileComparisonIndex?: number
 *      persistentState?: any
 *  }>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function DedupeGalleryModal({ extraProperties, modalResolve }) {
    return {
        component: (
            <div style={{width: "100%", height: "100%"}}>
                <LazyDedupeGallery
                    fileComparisons={extraProperties.fileComparisons}
                    initialFileComparisonIndex={extraProperties?.initialFileComparisonIndex}
                    persistentState={extraProperties.persistentState}
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