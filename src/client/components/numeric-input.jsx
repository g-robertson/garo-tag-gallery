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

    return <input className={className} type="text" value={selectedNumberState.get().toString()} onBlur={e => {
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
    }} />
}

export default NumericInput;