import '../global.css';
import { randomID, ReferenceableReact, unusedID } from '../js/client-util.js';

/** @import {ExistingStateRef, ExistingStateConstRef} from "../page/pages.js" */

/**
 * @template T
 * @typedef {Object} MultiSelectOption
 * @property {T} value
 * @property {string} displayName
 */

/**
 * @template T
 * @param {{
 *  optionsConstRef: ExistingStateConstRef<MultiSelectOption<T>[]>
 *  selectedOptionsRef: ExistingStateRef<Set<T>>
 * }} param0
 * @returns
 */
const MultiSelect = ({optionsConstRef, selectedOptionsRef}) => {
    const AllSelectedCheckbox = ReferenceableReact();
    const OptionsContainer = ReferenceableReact();
    
    const onAdd = () => {
        const onSelectedOptionsChanged = () => {
            AllSelectedCheckbox.dom.checked = optionsConstRef.get().length === selectedOptionsRef.get().size;
        };
        onSelectedOptionsChanged();

        const onOptionsChanged = () => {
            OptionsContainer.dom.replaceChildren(...(optionsConstRef.get().map(option => {
                const checkboxID = unusedID() + "-labelled-checkbox";
                return (
                    <div dom className="multiselect-option">
                        <input type="checkbox" id={checkboxID} checked={selectedOptionsRef.get().has(option.value)} className="multiselect-checkbox" onChange={(e) => {
                            if (e.currentTarget.checked) {
                                selectedOptionsRef.get().add(option.value)
                                selectedOptionsRef.forceUpdate();
                            } else {
                                selectedOptionsRef.get().delete(option.value)
                                selectedOptionsRef.forceUpdate();
                            }
                        }}/><label for={checkboxID}>{option.displayName}</label>
                    </div>
                );
            })));
            
            // Remove invalid options from selected options when options are changed
            const validOptions = new Set();
            for (const option of optionsConstRef.get()) {
                if (selectedOptionsRef.get().has(option.value)) {
                    validOptions.add(option.value);
                }
            }

            if (validOptions.size !== selectedOptionsRef.get().size) {
                selectedOptionsRef.update(validOptions);
            }
        };
        onOptionsChanged();

        let cleanup = () => {};
        cleanup = optionsConstRef.addOnUpdateCallback(onOptionsChanged, cleanup);
        cleanup = selectedOptionsRef.addOnUpdateCallback(onSelectedOptionsChanged, cleanup);
        return cleanup;
    };
    
    return (
        <div style={{flexDirection: "column"}} className="multiselect" onAdd={onAdd}>
            <div>
                {AllSelectedCheckbox.react(<input type="checkbox" onClick={(e) => {
                    // Set selected options to options if set, set to nothing if unset
                    selectedOptionsRef.update(new Set(e.currentTarget.checked ? optionsConstRef.get().map(option => option.value) : []));
                    for (const child of OptionsContainer.dom.querySelectorAll("input")) {
                        child.checked = e.currentTarget.checked;
                    }
                }}/>)}
                All
            </div>
            {OptionsContainer.react(<div style={{flexDirection: "column"}}></div>)}
        </div>
    );
};

export default MultiSelect;