/** @import {ExistingStateRef} from "../page/pages.js" */

/**
 * @param {{
 *     selectedNumberRef: ExistingStateRef<number>
 *     minValue?: number
 *     maxValue?: number
 *     className?: string
 * }} param0 
 * @returns 
 */
function NumericInput({selectedNumberRef, minValue, maxValue, className}) {
    minValue ??= -Infinity;
    maxValue ??= Infinity;

    return <input className={className} type="text" value={selectedNumberRef.get().toString()} onBlur={e => {
        let newNumericValue = Number(e.currentTarget.value);
        if (Number.isFinite(newNumericValue)) {
            if (newNumericValue < minValue) {
                newNumericValue = minValue;
            } else if (newNumericValue > maxValue) {
                newNumericValue = maxValue;
            }
            
            selectedNumberRef.update(newNumericValue);
            e.currentTarget.value = newNumericValue.toString();
        } else {
            e.currentTarget.value = selectedNumberRef.get().toString();
        }
    }} />
}

export default NumericInput;