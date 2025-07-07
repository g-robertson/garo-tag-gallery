import { useEffect, useState } from 'react';
import '../global.css';

/**
 * @template T
 * @typedef {Object} MultiSelectOption
 * @property {T} value
 * @property {string} displayName
 */

/**
 * @template T
 * @param {{
 *  options: MultiSelectOption<T>[]
 *  defaultOptionsSelected?: T[]
 *  onOptionsChange?: (optionsSelected: T[]) => void
 * }} param0
 * @returns
 */
const MultiSelect = ({options, defaultOptionsSelected, onOptionsChange}) => {
    defaultOptionsSelected ??= []
    onOptionsChange ??= () => {};
    const [optionIndicesSelected, setOptionIndicesSelected] = useState(new Set(defaultOptionsSelected.map(value => {
        const index = options.findIndex(option => option.value === value);
        if (index === -1) {
            throw `Value ${value} from defaultOptionSelected cannot be found in options array`;
        }
        return index;
    })));
    const allOptionsSelected = optionIndicesSelected.size === options.length;

    useEffect(() => {
        onOptionsChange([...optionIndicesSelected].map(index => options[index].value));
    }, [optionIndicesSelected]);
    return (
        <div style={{flexDirection: "column"}} class="multiselect">
            <div>
                <input type="checkbox" checked={allOptionsSelected} onClick={(e) => {
                    if (e.currentTarget.checked) {
                        setOptionIndicesSelected(new Set(options.map((_, index) => index)));
                    } else {
                        setOptionIndicesSelected(new Set());
                    }
                }}/>
                All
            </div>
            {options.map((option, index) => (
                <div class="multiselect-option">
                    <input type="checkbox" checked={optionIndicesSelected.has(index)} class="multiselect-checkbox" value={index} onChange={(e) => {
                        if (e.currentTarget.checked) {
                            optionIndicesSelected.add(index);
                        } else {
                            optionIndicesSelected.delete(index);
                        }

                        setOptionIndicesSelected(new Set(optionIndicesSelected));
                    }}/> {option.displayName}
                </div>
            ))}
        </div>
    );
};

export default MultiSelect;