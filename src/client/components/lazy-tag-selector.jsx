import LazySelector from "./lazy-selector.jsx";

/**
 * @template T
 * @param {{
 *  tags: T[]
 *  onValuesSelected?: (valuesSelected: T[]) => void
 *  onValuesDoubleClicked?: (valuesSelected: T[]) => void
 *  customItemComponent?: (param0: {realizedValue: T}) => JSX.Element
 *  customTitleRealizer?: (value: T) => string
 *  multiSelect?: boolean
 *  elementsSelectable?: boolean
 *  scrollbarWidth?: number
 * }} param0
 */
const LazyTagSelector = ({
    tags,
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
        values={tags}
        onValuesDoubleClicked={onValuesDoubleClicked}
        onValuesSelected={onValuesSelected}
        customItemComponent={customItemComponent}
        valuesRealizer={(values) => values}
        valueRealizationRange={Infinity}
        valueRealizationDelay={0}
        customTitleRealizer={customTitleRealizer}
        itemWidth={"100%"}
        itemHeight={20}
        multiSelect={multiSelect ?? false}
        elementsSelectable={elementsSelectable ?? true}
        scrollbarWidth={scrollbarWidth}
    />
}

export default LazyTagSelector;