/** @import {State} from "../js/state.js" */

/**
 * @param {{
 *     selectedNumberState: State<number>
 *     minValue?: number
 *     maxValue?: number
 *     className?: string
 * }} param0 
 * @returns 
 */
function NumericInput({selectedNumberState, minValue, maxValue, className}) {
    minValue ??= -Infinity;
    maxValue ??= Infinity;
    className ??= "";

    /**
     * @param {Event} e 
     */
    const onUpdate = (e) => {
        let newNumericValue = Number(e.currentTarget.value);
        if (Number.isFinite(newNumericValue)) {
            if (newNumericValue < minValue) {
                newNumericValue = minValue;
            } else if (newNumericValue > maxValue) {
                newNumericValue = maxValue;
            }
            
            selectedNumberState.set(newNumericValue);
            e.currentTarget.value = newNumericValue.toString();
        } else {
            e.currentTarget.value = selectedNumberState.get().toString();
        }
    }

    return <input className={className} type="text" value={selectedNumberState.get().toString()} onBlur={onUpdate} onKeyUp={(e) => {
        if (e.key === "Enter") {
            onUpdate(e);
        }
    }} />
}

export default NumericInput;