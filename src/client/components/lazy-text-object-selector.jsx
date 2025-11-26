import LazySelector from "./lazy-selector.jsx";

/** @import {ExistingStateConstRef} from "../page/pages.js" */

/**
 * @template T
 * @param {{
 *  textObjectsConstRef: ExistingStateConstRef<T[]>
 *  onValuesSelected?: (valuesSelected: T[], indicesSelected: number[]) => void
 *  onValuesDoubleClicked?: (valuesSelected: T[], indicesSelected: number[]) => void
 *  customItemComponent?: (param0: {realizedValue: T, index: number}) => JSX.Element
 *  customTitleRealizer?: (value: T) => string
 *  multiSelect?: boolean
 *  elementsSelectable?: boolean
 *  scrollbarWidth?: number
 * }} param0
 */
const LazyTextObjectSelector = ({
    textObjectsConstRef,
    onValuesSelected,
    onValuesDoubleClicked,
    customItemComponent,
    customTitleRealizer,
    multiSelect,
    elementsSelectable,
    scrollbarWidth
}) => {
    scrollbarWidth ??= 17;
    customItemComponent ??= ({realizedValue}) => (<>{realizedValue.displayName}</>);
    return <LazySelector
        valuesConstRef={textObjectsConstRef}
        onValuesDoubleClicked={onValuesDoubleClicked}
        onValuesSelected={onValuesSelected}
        customItemComponent={customItemComponent}
        valuesRealizer={(values) => values}
        valueRealizationRange={Infinity}
        valueRealizationDelay={0}
        customTitleRealizer={customTitleRealizer}
        itemProperties={{
            width: "100%",
            height: 20
        }}
        multiSelect={multiSelect ?? false}
        elementsSelectable={elementsSelectable ?? true}
        scrollbarWidth={scrollbarWidth}
    />
}

export default LazyTextObjectSelector;