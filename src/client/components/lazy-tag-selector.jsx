import LazySelector from "./lazy-selector.jsx";

/**
 * @template T
 * @param {{
 *  tags: T[]
 *  onValuesDoubleClicked?: (valuesSelected: T[]) => void
 *  customItemComponent?: (param0: {realizedValue: T}) => JSX.Element
 *  customTitleRealizer?: (value: T) => string
 * }} param0
 */
const LazyTagSelector = ({tags, onValuesDoubleClicked, customItemComponent, customTitleRealizer}) => {
    return <LazySelector
        values={tags}
        onValuesDoubleClicked={onValuesDoubleClicked}
        customItemComponent={customItemComponent}
        valuesRealizer={(values) => values}
        valueRealizationRange={Infinity}
        valueRealizationDelay={0}
        customTitleRealizer={customTitleRealizer}
        itemWidth={"100%"}
        itemHeight={20}
    />
}

export default LazyTagSelector;