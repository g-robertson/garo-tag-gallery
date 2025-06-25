import { useState } from "react";

/**
 * 
 * @param {{
 *     defaultValue?: number
 *     onChange?: (num: number) => void
 *     minValue?: number
 *     maxValue?: number
 * }} param0 
 * @returns 
 */
function NumericInput({defaultValue, onChange, minValue, maxValue}) {
    minValue ??= -Infinity;
    maxValue ??= Infinity;
    defaultValue ??= 0;
    onChange ??= () => {};
    const [numericValue, setNumericValue] = useState(defaultValue);
    const [textValue, setTextValue] = useState(defaultValue.toString());

    return <input type="text" value={textValue} onChange={e => {
        setTextValue(e.currentTarget.value);
    }} onBlur={e => {
        let newNumericValue = Number(textValue);
        if (Number.isFinite(newNumericValue)) {
            if (newNumericValue < minValue) {
                newNumericValue = minValue;
            } else if (newNumericValue > maxValue) {
                newNumericValue = maxValue;
            }
            
            setNumericValue(newNumericValue);
            onChange(newNumericValue);
            setTextValue(newNumericValue.toString())
        } else {
            setTextValue(numericValue.toString())
        }
    }} />
}

export default NumericInput;