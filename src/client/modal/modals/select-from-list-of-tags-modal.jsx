import DualListboxLazyTextObjectSelector from '../../components/dual-listbox-lazy-text-object-selector.jsx';
import '../../global.css';
import { Modals } from '../../modal/modals.js';
import { ExistingState } from '../../page/pages.js';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {Modal} from "../modals.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      tags: any[]
 *  }>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function SelectFromListOfTags({ extraProperties, modalResolve }) {
    const selectedTagsRef = ExistingState.stateRef(new Set());

    return {
        component: (
            <div className="select-from-list-of-tags-modal" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                Select from list of tags:
                <div style={{width: "100%", height: "100%"}}>
                    <DualListboxLazyTextObjectSelector
                        items={extraProperties.tags}
                        selectedItemsRef={selectedTagsRef}
                        customItemSelectorComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                        customItemSelectedComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                        customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    />
                </div>
                <input style={{margin: 8}} type="button" value="Select tags" onClick={() => {
                    modalResolve([...selectedTagsRef.get()]);
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Select list of tags"
    };
};