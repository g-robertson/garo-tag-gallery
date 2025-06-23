import { useEffect, useState } from 'react';
import '../global.css';

/**
 * @typedef {Object} MultiSelectOption
 * @property {string} value
 * @property {string} displayName
 */

/**
 * @param {{
 *  options: MultiSelectOption[]
 *  defaultOptionsSelected?: string[]
 *  onOptionsChange?: (optionsSelected: string[]) => void
 * }} param0
 * @returns
 */
const MultiSelect = ({options, defaultOptionsSelected, onOptionsChange}) => {
    defaultOptionsSelected ??= options.map(option => option.value);
    onOptionsChange ??= () => {};
    const [optionsSelected, setOptionsSelected] = useState(new Set(defaultOptionsSelected));
    const allOptionsSelected = optionsSelected.size === options.length;

    useEffect(() => {
        onOptionsChange([...optionsSelected]);
    }, [optionsSelected])
    return (
        <div style={{flexDirection: "column"}} class="multiselect">
            <div>
                <input type="checkbox" checked={allOptionsSelected} onClick={(e) => {
                    if (e.currentTarget.checked) {
                        setOptionsSelected(new Set(options.map(option => option.value)));
                    } else {
                        setOptionsSelected(new Set());
                    }
                }}/>
                All
            </div>
            {options.map(option => (
                <div class="multiselect-option">
                    <input type="checkbox" checked={optionsSelected.has(option.value)} class="multiselect-checkbox" value={option.value} onChange={(e) => {
                        if (e.currentTarget.checked) {
                            optionsSelected.add(option.value);
                        } else {
                            optionsSelected.delete(option.value);
                        }

                        setOptionsSelected(new Set(optionsSelected));
                    }}/> {option.displayName}
                </div>
            ))}
        </div>
    );
};

export default MultiSelect;