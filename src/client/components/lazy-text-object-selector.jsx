import LazySelector from "./lazy-selector.jsx";

/** @import {ConstState} from "../js/state.js" */

/**
 * @template T
 * @param {{
 *  textObjectsConstState: ConstState<T[]>
 *  onValuesHighlighted?: (valuesSelected: T[], indicesSelected: number[]) => void
 *  onValuesSelected?: (valuesSelected: T[], indicesSelected: number[]) => void
 *  customItemComponent?: (param0: {realizedValue: T, index: number}) => JSX.Element
 *  customTitleRealizer?: (value: T) => string
 *  multiHighlight?: boolean
 *  multiSelect?: boolean
 *  styleSelectedValues?: boolean
 *  elementsSelectable?: boolean
 *  scrollbarWidth?: number
 * }} param0
 */
const LazyTextObjectSelector = ({
    textObjectsConstState,
    onValuesHighlighted,
    onValuesSelected,
    customItemComponent,
    customTitleRealizer,
    multiHighlight,
    multiSelect,
    styleSelectedValues,
    elementsSelectable,
    scrollbarWidth
}) => {
    multiHighlight ??= false;
    multiSelect ??= multiHighlight;
    styleSelectedValues ??= false;
    elementsSelectable ??= true;
    scrollbarWidth ??= 17;
    customItemComponent ??= ({realizedValue}) => (<>{realizedValue.displayName}</>);
    return <LazySelector
        valuesConstState={textObjectsConstState}
        onValuesSelected={onValuesSelected}
        onValuesHighlighted={onValuesHighlighted}
        customItemComponent={customItemComponent}
        valuesRealizer={(values) => values}
        valueRealizationRange={Infinity}
        valueRealizationDelay={0}
        customTitleRealizer={customTitleRealizer}
        itemProperties={{
            width: "100%",
            height: 20
        }}
        multiHighlight={multiHighlight}
        multiSelect={multiSelect}
        styleSelectedValues={styleSelectedValues}
        elementsSelectable={elementsSelectable}
        scrollbarWidth={scrollbarWidth}
    />
}

export default LazyTextObjectSelector;