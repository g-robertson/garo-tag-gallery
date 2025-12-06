import '../global.css';
import { executeFunctions, randomID, ReferenceableReact, unusedID } from '../js/client-util.js';

/** @import {State, ConstState} from "../page/pages.js" */

/**
 * @template T
 * @typedef {Object} MultiSelectOption
 * @property {T} value
 * @property {string} displayName
 */

/**
 * @template T
 * @param {{
 *  optionsConstState: ConstState<MultiSelectOption<T>[]>
 *  selectedOptionsRef: State<Set<T>>
 * }} param0
 * @returns
 */
const MultiSelect = ({optionsConstState, selectedOptionsRef}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const AllSelectedCheckbox = ReferenceableReact();
    const OptionsContainer = ReferenceableReact();
    
    const onAdd = () => {
        const onSelectedOptionsChanged = () => {
            AllSelectedCheckbox.dom.checked = optionsConstState.get().length === selectedOptionsRef.get().size;
        };
        onSelectedOptionsChanged();

        const onOptionsChanged = () => {
            OptionsContainer.dom.replaceChildren(...(optionsConstState.get().map(option => {
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
            for (const option of optionsConstState.get()) {
                if (selectedOptionsRef.get().has(option.value)) {
                    validOptions.add(option.value);
                }
            }

            if (validOptions.size !== selectedOptionsRef.get().size) {
                selectedOptionsRef.set(validOptions);
            }
        };
        onOptionsChanged();

        optionsConstState.addOnUpdateCallback(onOptionsChanged, addToCleanup);
        selectedOptionsRef.addOnUpdateCallback(onSelectedOptionsChanged, addToCleanup);

        return () => executeFunctions(addToCleanup);
    };
    
    return (
        <div style={{flexDirection: "column"}} className="multiselect" onAdd={onAdd}>
            <div>
                {AllSelectedCheckbox.react(<input type="checkbox" onClick={(e) => {
                    // Set selected options to options if set, set to nothing if unset
                    selectedOptionsRef.set(new Set(e.currentTarget.checked ? optionsConstState.get().map(option => option.value) : []));
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