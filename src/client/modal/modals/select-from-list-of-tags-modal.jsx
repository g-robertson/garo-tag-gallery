import DualListboxLazyTextObjectSelector from '../../components/dual-listbox-lazy-text-object-selector.jsx';
import '../../global.css';
import { Modals } from '../../modal/modals.js';
import { State } from '../../js/state.js';

/** 
 * @param {{
 *  tags: any[]
 * }}
*/
export default function SelectFromListOfTags({ tags }) {
    const selectedTagsState = new State(new Set());

    let modalResolve;
    /** @type {Promise<any[]>} */
    const promiseValue = new Promise(resolve => { modalResolve = resolve; });

    return {
        component: (
            <div className="select-from-list-of-tags-modal" style={{width: "100%", height: "100%", flexDirection: "column"}}>
                Select from list of tags:
                <div style={{width: "100%", height: "100%"}}>
                    <DualListboxLazyTextObjectSelector
                        items={tags}
                        selectedItemsState={selectedTagsState}
                        customItemSelectorComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                        customItemSelectedComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                        customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    />
                </div>
                <input style={{margin: 8}} type="button" value="Select tags" onClick={() => {
                    modalResolve([...selectedTagsState.get()]);
                    Modals.Global().popModal();
                }} />
            </div>
        ),
        displayName: "Select list of tags",
        promiseValue
    };
};