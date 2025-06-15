import { useEffect, useRef, useState } from 'react';
import '../global.css';
import { randomID } from '../js/client-util.js';
import Scrollbar from './scrollbar.jsx';

/** @import {JSX} from "react" */

/**
 * @template T
 * @typedef {Object} SelectValue
 * @property {T} value
 */

/**
 * @template T
 * @template R
 * @param {{
 *  values: T[]
 *  onValuesSelected?: (realizedValuesSelected: Awaited<R>[]) => void
 *  onValuesDoubleClicked?: (realizedValuesSelected: Awaited<R>[]) => void
 *  valuesRealizer: (values: T[]) => R
 *  valueRealizationRange?: number
 *  valueRealizationDelay?: number
 *  customItemComponent?: (param0: {realizedValue: Awaited<R>, width: number, height: number}) => JSX.Element
 *  customTitleRealizer?: (realizedValue: Awaited<R>) => string,
 *  itemWidth: number | "100%"
 *  itemHeight: number | "100%"
 *  horizontalMargin?: number
 *  verticalMargin?: number
 *  scrollbarIncrement?: number
 *  initialLastClickedIndex?: number
 *  scrollbarWidth?: number
 *  elementsSelectable?: boolean
 *  multiSelect?: boolean
 * }} param0
 */
function LazySelector({
    values,
    onValuesSelected,
    onValuesDoubleClicked,
    valuesRealizer,
    valueRealizationRange,
    valueRealizationDelay,
    customItemComponent,
    customTitleRealizer,
    itemWidth,
    itemHeight,
    horizontalMargin,
    verticalMargin,
    scrollbarIncrement,
    initialLastClickedIndex,
    scrollbarWidth,
    multiSelect,
    elementsSelectable
}) {
    onValuesDoubleClicked ??= () => {};
    onValuesSelected ??= () => {};
    valueRealizationRange ??= 5;
    valueRealizationDelay ??= 200;
    customItemComponent ??= ({realizedValue}) => (<>{realizedValue}</>);
    customTitleRealizer ??= () => "";
    horizontalMargin ??= 0;
    verticalMargin ??= 0;
    scrollbarIncrement ??= 4;
    initialLastClickedIndex ??= null;
    scrollbarWidth ??= 17;
    multiSelect ??= true;
    elementsSelectable ??= true;


    const uniqueID = useRef(randomID(32));
    const [widthAvailable, setWidthAvailable] = useState(0);
    const [heightAvailable, setHeightAvailable] = useState(0);

    /** @type {[R[], (realizedValues: R[]) => void]} */
    const [realizedValues, setRealizedValues] = useState([]);
    const realizedValuesRef = useRef(realizedValues);
    realizedValuesRef.current = realizedValues;
    /** @type {{current: Promise<Awaited<R>>[]}} */
    const realizingValues = useRef([]);
    const setToRealizeSync = useRef(0);

    const columnCountAvailable = useRef(1);
    let fullItemWidth = "100%";
    if (typeof itemWidth === "number") {
        fullItemWidth = itemWidth + (2 * horizontalMargin);
        columnCountAvailable.current = Math.floor(widthAvailable / fullItemWidth);
    } else {
        fullItemWidth = widthAvailable;
    }

    const rowCountAvailable = useRef(1);
    let fullItemHeight = "100%";
    if (typeof itemHeight === "number") {
        fullItemHeight = itemHeight + (2 * verticalMargin);
        rowCountAvailable.current = Math.floor(heightAvailable / fullItemHeight);
    } else {
        fullItemHeight = heightAvailable;
    }

    const optionShowCount = useRef(rowCountAvailable.current * columnCountAvailable.current);
    optionShowCount.current = rowCountAvailable.current * columnCountAvailable.current;
    const [shownStartIndex, setShownStartIndex] = useState(initialLastClickedIndex);
    const shownEndIndex = shownStartIndex + optionShowCount.current - 1;

    const lastPossibleShownStartIndex = useRef(0);
    lastPossibleShownStartIndex.current = Math.max((columnCountAvailable.current * Math.ceil(values.length / columnCountAvailable.current)) - optionShowCount.current, 0);

    /** @type {[number | null, (lastClickedIndex: number | null) => void]} */
    const [lastClickedIndex, setLastClickedIndex] = useState(initialLastClickedIndex);
    /** @type {{current: number | null}} */
    const lastClickedIndexRef = useRef(lastClickedIndex);
    lastClickedIndexRef.current = lastClickedIndex;
    /** @type {[Set<number> | null, (preShiftClickIndices: Set<number> | null) => void]} */
    const [preShiftClickIndices, setPreShiftClickIndices] = useState(null);
    /** @type {[Set<number>, (selectedIndices: Set<number>) => void]} */
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    const isClickFocused = useRef(false);

    let selectableContentsWidth = widthAvailable;
    if (typeof itemWidth === "number") {
        selectableContentsWidth = columnCountAvailable.current * fullItemWidth;
    }
    let selectableContentsHeight = heightAvailable;
    if (typeof itemHeight === "number") {
        selectableContentsHeight = rowCountAvailable.current * fullItemHeight;
    }

    /** @type {(index: number => void)} */
    const getClampedValueIndex = (index) => {
        if (index < 0) {
            return 0;
        } else if (index >= valuesRef.current.length) {
            return valuesRef.current.length - 1;
        } else {
            return index;
        }
    }

    const getClampedShownStartIndex = (shownStartIndex) => {
        if (columnCountAvailable.current === 0) {
            return 0;
        }

        if (shownStartIndex < 0) {
            shownStartIndex =  0;
        } else if (shownStartIndex > lastPossibleShownStartIndex.current) {
            shownStartIndex =  lastPossibleShownStartIndex.current;
        }

        return Math.ceil(shownStartIndex / columnCountAvailable.current) * columnCountAvailable.current;
    }

    const clampedStartIndex = getClampedShownStartIndex(shownStartIndex);
    if (shownStartIndex !== clampedStartIndex) {
        setShownStartIndex(clampedStartIndex);
    }


    useEffect(() => {
        const onKeyDown = (e) => {
            if (!isClickFocused.current && elementsSelectable) {
                return;
            }

            let change = 0;
            if (e.key === "ArrowDown") {
                change = columnCountAvailable.current;
            } else if (e.key === "ArrowUp") {
                change = -columnCountAvailable.current;
            } else if (rowCountAvailable.current !== 1 || !elementsSelectable) {
                if (e.key === "ArrowRight") {
                    change = 1;
                } else if (e.key === "ArrowLeft") {
                    change = -1;
                } else {
                    return;
                }
            } else {
                return;
            }

            const newIndex = getClampedValueIndex(lastClickedIndexRef.current + change);
            if (newIndex !== lastClickedIndexRef.current) {
                setLastClickedIndex(newIndex);
                setSelectedIndices(new Set([newIndex]));
            }
        }
        window.addEventListener("keydown", onKeyDown);

        const onResize = () => {
            const parent = document.getElementById(LAZY_SELECTOR_ID).parentElement;
            setWidthAvailable(parent.clientWidth);
            setHeightAvailable(Math.max(20, parent.clientHeight));
        };
        onResize();
        window.addEventListener("resize", onResize);

        
        const onClickFocusOutListener = (e) => {
            let parent = e.target;
            do {
                if (parent.id === LAZY_SELECTOR_ID) {
                    return;
                }
                parent = parent.parentElement;
            } while (parent !== null && parent !== undefined);
            isClickFocused.current = false;
        }
        window.addEventListener("click", onClickFocusOutListener);
        document.getElementById(LAZY_SELECTOR_ID).addEventListener("click", () => {
            isClickFocused.current = true;
        });

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("click", onClickFocusOutListener);
        }
    }, []);

    useEffect(() => {
        setPreShiftClickIndices(null);

        if (lastClickedIndex < shownStartIndex) {
            setShownStartIndex(getClampedShownStartIndex(Math.floor(lastClickedIndex / columnCountAvailable.current) * columnCountAvailable.current));
        }
        if (lastClickedIndex > shownEndIndex) {
            setShownStartIndex(getClampedShownStartIndex(Math.ceil((lastClickedIndex - optionShowCount.current + 1) / columnCountAvailable.current) * columnCountAvailable.current));
        }
    }, [lastClickedIndex])

    /**
     * @param {Iterable<number>} indices 
     * @param {T[]} values
     * @param {number} localValuesRealizationSync
     */
    const setToRealize = async (indices, values, localValuesRealizationSync) => {
        /** @type {{index: number, value: T}[]} */
        const absentValues = []

        const newRealizedValues = [...realizedValuesRef.current];

        for (const index of indices) {
            if (newRealizedValues[index] === undefined && realizingValues[index] === undefined && values[index] !== undefined) {
                absentValues.push({
                    index,
                    value: values[index]
                });
            }
        }

        if (absentValues.length === 0) {
            return;
        }

        const valuesPromise = valuesRealizer(absentValues.map(absentValue => absentValue.value));
        if (valuesPromise instanceof Promise) {
            for (let i = 0; i < absentValues.length; ++i) {
                const absentValue = absentValues[i];
                realizingValues.current[absentValue.index] = (async () => {
                    const values = await valuesPromise;
                    return values[i];
                })();
            }

            for (const {index} of absentValues) {
                newRealizedValues[index] = await realizingValues.current[index];
            }
        } else {
            for (let i = 0; i < absentValues.length; ++i) {
                realizingValues.current[absentValues[i].index] = valuesPromise[i];
                newRealizedValues[absentValues[i].index] = valuesPromise[i];
            }
        }


        if (localValuesRealizationSync === valuesRealizationSync.current) {
            setRealizedValues([...newRealizedValues]);
        }
    }

    const scrollbarSetItemPositionOut = {out: () => {}};
    useEffect(() => {
        scrollbarSetItemPositionOut.out(shownStartIndex);
    }, [shownStartIndex]);


    const valuesRef = useRef(values);
    const valuesRealizationSync = useRef(0);

    const realizeItems = useRef(async () => {});
    realizeItems.current = async () => {
        const lambdaScopedRealizationSync = setToRealizeSync.current;
        const lambdaScopedValuesSync = valuesRealizationSync.current;
        await setToRealize(selectedIndices, valuesRef.current, lambdaScopedValuesSync);

        // bailout if we no longer match current set realization sync
        if (lambdaScopedRealizationSync !== setToRealizeSync.current) {
            return;
        }

        /** @type {number[]} */
        const shownIndices = [];
        for (let i = shownStartIndex; i <= shownEndIndex; ++i) {
            shownIndices.push(i);
        }
        await setToRealize(shownIndices, valuesRef.current, lambdaScopedValuesSync);

        // bailout if we no longer match current set realization sync
        if (lambdaScopedRealizationSync !== setToRealizeSync.current) {
            return;
        }

        /** @type {number[]} */
        const realizationRangeIndices = [];
        const realizationRangeFrom = Math.max(0, shownStartIndex - valueRealizationRange * optionShowCount.current);
        const realizationRangeTo = Math.min(valuesRef.current.length - 1, shownEndIndex + valueRealizationRange * optionShowCount.current);
        for (let i = realizationRangeFrom; i <= realizationRangeTo; ++i) {
            realizationRangeIndices.push(i);
        }
        await setToRealize(realizationRangeIndices, valuesRef.current, lambdaScopedValuesSync);
    };

    if (valuesRef.current !== values) {
        if (valuesRef.current.length > values.length) {
            setPreShiftClickIndices(null);
            setSelectedIndices(new Set());

            lastClickedIndexRef.current = null;
        }

        ++valuesRealizationSync.current;
        valuesRef.current = values;
        realizingValues.current = [];
        setRealizedValues([]);
    }

    useEffect(() => {

        if (valueRealizationDelay === 0) {
            realizeItems.current();
        } else {
            const timeoutHandle = setTimeout(realizeItems.current, valueRealizationDelay);
            return () => {
                clearTimeout(timeoutHandle);
            };
        }
    }, [shownStartIndex, selectedIndices, values]);


    useEffect(() => {
        if (!multiSelect && selectedIndices.size >= 1) {
            const selectedIndex = [...selectedIndices][0];
            if (selectedIndices.size > 1 || selectedIndex !== lastClickedIndex) {
                setSelectedIndices(new Set([lastClickedIndex]));
                return;
            }
        }

        (async () => {
            /** @type {R[]} */
            const realizedValuesDoubleClicked = [];
            setToRealize(selectedIndices, valuesRef.current, valuesRealizationSync.current);
            for (const index of selectedIndices) {
                if (realizedValues[index] === undefined) {
                    if (realizingValues.current[index] === undefined) {
                        throw "Both realized and realizing values were undefined on double click, should not be possible";
                    } else {
                        realizedValuesDoubleClicked.push(await realizingValues[index]);
                    }
                } else {
                    realizedValuesDoubleClicked.push(realizedValues[index]);
                }
            }

            onValuesSelected([...selectedIndices].map(selectedIndex => realizedValues[selectedIndex]));
        })();
    }, [selectedIndices]);

    const LAZY_SELECTOR_ID = `lazy-selector-${uniqueID.current}`;
    const SELECTABLE_CONTENTS_ID = `lazy-selector-selectable-contents-${uniqueID.current}`
    const SCROLLABLE_ELEMENTS = [SELECTABLE_CONTENTS_ID];

    return (
        <div style={{position: "absolute", width: selectableContentsWidth, height: selectableContentsHeight}} id={LAZY_SELECTOR_ID} class="lazy-select">
            <div style={{width: "100%", height: "100%"}}>
                <div id={SELECTABLE_CONTENTS_ID} className="lazy-selector-selectable-contents" style={{width: `calc(100% - ${scrollbarWidth}px)`, height: "100%", float: "left", flexDirection: "column"}}>
                    {(() => {
                        /** @type {JSX.Element[]} */
                        const rows = [];
                        for (let i = 0; i < rowCountAvailable.current; ++i) {
                            /** @type {JSX.Element[]} */
                            const rowItems = [];
                            for (let j = 0; j < columnCountAvailable.current; ++j) {
                                const itemIndex = (i * columnCountAvailable.current) + j + shownStartIndex;
                                const realizedValue = realizedValues[itemIndex];
                                
                                if (realizedValue === undefined) {
                                    rowItems.push(<div className="lazy-selector-selectable-item" style={{
                                        width: itemWidth,
                                        height: itemHeight,
                                        marginTop: verticalMargin,
                                        marginBottom: verticalMargin,
                                        marginLeft: horizontalMargin,
                                        marginRight: horizontalMargin
                                    }}></div>);
                                } else {
                                    rowItems.push(
                                        <div className={`lazy-selector-selectable-item${elementsSelectable ? " selectable" : ""}${selectedIndices.has(itemIndex) ? " selected" : ""}`}
                                             title={customTitleRealizer(realizedValue)}
                                             style={{
                                                width: itemWidth,
                                                lineHeight: `${itemHeight}px`,
                                                height: itemHeight,
                                                marginTop: verticalMargin,
                                                marginBottom: verticalMargin,
                                                marginLeft: horizontalMargin,
                                                marginRight: horizontalMargin
                                            }}
                                             onClick={e => {
                                                if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                                    return;
                                                }
                                                let newSelectedIndices;


                                                if (!multiSelect) {
                                                    setLastClickedIndex(itemIndex);
                                                    setSelectedIndices(new Set([itemIndex]));
                                                } else if (e.ctrlKey) {
                                                    setLastClickedIndex(itemIndex);
                                                    newSelectedIndices = selectedIndices;
                                                    if (selectedIndices.has(itemIndex)) {
                                                        newSelectedIndices.delete(itemIndex);
                                                    } else {
                                                        newSelectedIndices.add(itemIndex);
                                                    }
                                                } else if (e.shiftKey) {
                                                    if (preShiftClickIndices === null) {
                                                        newSelectedIndices = selectedIndices;
                                                        setPreShiftClickIndices(new Set([...selectedIndices]));
                                                    } else {
                                                        newSelectedIndices = new Set([...preShiftClickIndices]);
                                                    }
                                                    let from = lastClickedIndex;
                                                    let to = itemIndex;
                                                    if (from > to) {
                                                        const tmp = from;
                                                        from = to;
                                                        to = tmp;
                                                    }

                                                    for (; from <= to; ++from) {
                                                        newSelectedIndices.add(from);
                                                    }
                                                } else if (!selectedIndices.has(itemIndex)) {
                                                    setLastClickedIndex(itemIndex);
                                                    newSelectedIndices = new Set([itemIndex]);
                                                }

                                                if (newSelectedIndices !== undefined) {
                                                    setSelectedIndices(new Set([...newSelectedIndices]));
                                                }
                                             }}
                                             onDoubleClick={async (e) => {
                                                if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                                    return;
                                                }

                                                /** @type {R[]} */
                                                const realizedValuesDoubleClicked = [];
                                                setToRealize(selectedIndices, valuesRef.current, valuesRealizationSync.current);
                                                for (const index of selectedIndices) {
                                                    if (realizedValues[index] === undefined) {
                                                        if (realizingValues.current[index] === undefined) {
                                                            throw "Both realized and realizing values were undefined on double click, should not be possible";
                                                        } else {
                                                            realizedValuesDoubleClicked.push(await realizingValues[index]);
                                                        }
                                                    } else {
                                                        realizedValuesDoubleClicked.push(realizedValues[index]);
                                                    }
                                                }

                                                onValuesDoubleClicked(realizedValuesDoubleClicked);
                                             }}
                                        >
                                            {customItemComponent({realizedValue})}
                                        </div>
                                    );
                                }
                            }

                            rows.push(<div style={{width: "100%", height: fullItemHeight}}>
                                {rowItems}
                            </div>);
                        }

                        return rows;
                    })()}
                </div>
                <Scrollbar length={selectableContentsHeight}
                           itemsDisplayed={optionShowCount.current}
                           totalItems={values.length}
                           setItemPositionOut={scrollbarSetItemPositionOut}
                           alternativeScrollingElements={SCROLLABLE_ELEMENTS}
                           scrollbarInterval={columnCountAvailable.current}
                           scrollbarIncrement={columnCountAvailable.current * scrollbarIncrement}
                           scrollbarWidth={scrollbarWidth}
                           onScrollbarUpdate={(e) => {
                               setShownStartIndex(e);
                           }}
                />
            </div>
        </div>
    );
};

export default LazySelector;