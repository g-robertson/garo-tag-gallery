import { useEffect, useRef, useState } from 'react';
import '../global.css';
import { clamp, randomID, RealizationMap } from '../js/client-util.js';
import Scrollbar from './scrollbar.jsx';

/** @import {JSX} from "react" */

/**
 * @typedef {Object} ItemProperties
 * @property {number | "100%"} width
 * @property {number | "100%"} height
 * @property {number} horizontalMargin
 * @property {number} verticalMargin
 */

/**
 * @template T
 * @typedef {Object} SelectValue
 * @property {T} value
 */

/**
 * @param {{width: number, height: number}} dimensionsAvailable  
 * @param {ItemProperties} itemProperties
 */
function fullItemDimensions_(dimensionsAvailable, itemProperties) {
    let width = dimensionsAvailable.width;
    if (typeof itemProperties.width === "number") {
        width = itemProperties.width + (2 * itemProperties.horizontalMargin);
    }
    let height = dimensionsAvailable.height;
    if (typeof itemProperties.height === "number") {
        height = itemProperties.height + (2 * itemProperties.horizontalMargin);
    }
    return {width, height};
}

/**
 * @param {{width: number, height: number}} dimensionsAvailable
 * @param {number} fullItemWidth
 */
function columnCountAvailable_(dimensionsAvailable, fullItemWidth) {
    if (fullItemWidth === 0) {
        return 0;
    }
    return Math.floor(dimensionsAvailable.width / fullItemWidth);
}

/**
 * @param {{width: number, height: number}} dimensionsAvailable
 * @param {number} fullItemHeight
 */
function rowCountAvailable_(dimensionsAvailable, fullItemHeight) {
    if (fullItemHeight === 0) {
        return 0;
    }
    return Math.floor(dimensionsAvailable.height / fullItemHeight);
}

/**
 * @param {number} rowCountAvailable 
 * @param {number} columnCountAvailable
 */
function currentItemsShownCount_(rowCountAvailable, columnCountAvailable) {
    return rowCountAvailable * columnCountAvailable;
}

/**
 * @param {number} columnCountAvailable
 * @param {number} currentItemsShownCount
 * @param {number} valuesLength
 */
function lastPossibleShownStartIndex_(columnCountAvailable, currentItemsShownCount, valuesLength) {
    if (columnCountAvailable === 0) {
        return 0;
    }

    return Math.max((columnCountAvailable * Math.ceil(valuesLength / columnCountAvailable)) - currentItemsShownCount, 0);
}

/**
 * @param {number} shownStartIndex
 * @param {number} currentItemsShownCount
 */
function shownEndIndex_(shownStartIndex, currentItemsShownCount) {
    return shownStartIndex + currentItemsShownCount - 1;
}

/**
 * @param {number} shownStartIndex 
 * @param {number} lastPossibleShownStartIndex 
 * @param {number} columnCountAvailable
 */
function clampShownStartIndex(shownStartIndex, lastPossibleShownStartIndex, columnCountAvailable) {
    if (columnCountAvailable === 0) {
        return shownStartIndex;
    }
    if (lastPossibleShownStartIndex <= 0) {
        return shownStartIndex;
    }

    if (shownStartIndex < 0) {
        return 0;
    } else if (shownStartIndex > lastPossibleShownStartIndex) {
        shownStartIndex = lastPossibleShownStartIndex;
    }

    return Math.ceil(shownStartIndex / columnCountAvailable) * columnCountAvailable;
}

/**
 * @template T
 * @template R
 * @param {{
 *  values: T[]
 *  onValuesSelected?: (realizedValuesSelected: Awaited<R>[], indices: number[]) => void
 *  onValuesDoubleClicked?: (realizedValuesSelected: Awaited<R>[], indices: number[], indexClicked: number) => void
 *  valuesRealizer: ((values: T[]) => Promise<R[]>) | ((values: T[]) => R[])
 *  realizeSelectedValues: boolean
 *  valueRealizationRange?: number
 *  valueRealizationDelay?: number
 *  realizeMinimumCount?: number
 *  customItemComponent?: (param0: {realizedValue: Awaited<R>, index: number, setRealizedValue: (realizedValue: Awaited<R>) => void, width: number, height: number}) => JSX.Element
 *  customTitleRealizer?: (realizedValue: Awaited<R>) => string,
 *  itemProperties: ItemProperties
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
    realizeSelectedValues,
    valueRealizationRange,
    valueRealizationDelay,
    realizeMinimumCount,
    customItemComponent,
    customTitleRealizer,
    itemProperties,
    scrollbarIncrement,
    initialLastClickedIndex,
    scrollbarWidth,
    multiSelect,
    elementsSelectable
}) {
    onValuesDoubleClicked ??= () => {};
    onValuesSelected ??= () => {};
    realizeSelectedValues ??= true;
    valueRealizationRange ??= 5;
    valueRealizationDelay ??= 200;
    realizeMinimumCount ??= 0;
    customItemComponent ??= ({realizedValue}) => (<>{realizedValue}</>);
    customTitleRealizer ??= () => "";
    itemProperties.horizontalMargin ??= 0;
    itemProperties.verticalMargin ??= 0;
    scrollbarIncrement ??= 4;
    initialLastClickedIndex ??= null;
    scrollbarWidth ??= 17;
    multiSelect ??= true;
    elementsSelectable ??= true;

    // TODO: fix this component so it has less than 8 rerenders on load

    const uniqueID = useRef(randomID(32));
    const [dimensionsAvailable, setDimensionsAvailable] = useState({width: 0, height: 0});
    /** @type {[{ref: RealizationMap<number, R>}, (realizedValues: {ref: RealizationMap<R>}) => void]} */
    const [realizedValues, setRealizedValues] = useState({ref: new RealizationMap()});

    const [shownStartIndex, setShownStartIndex] = useState(initialLastClickedIndex ?? 0);
    /** @type {(values: T[]) => number} */

    /** @type {{current: Set<number> | null}} */
    const preShiftClickIndices = useRef(null);
    /** @type {[Set<number>, (selectedIndices: Set<number>) => void]} */
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    const isClickFocused = useRef(false);
    

    // closure refs
    const fullItemDimensionsRef            = useRef(fullItemDimensions_(dimensionsAvailable, itemProperties));
    fullItemDimensionsRef.current          =        fullItemDimensions_(dimensionsAvailable, itemProperties);
    const columnCountAvailableRef          = useRef(columnCountAvailable_(dimensionsAvailable, fullItemDimensionsRef.current.width));
    columnCountAvailableRef.current        =        columnCountAvailable_(dimensionsAvailable, fullItemDimensionsRef.current.width);
    const rowCountAvailableRef             = useRef(rowCountAvailable_(dimensionsAvailable, fullItemDimensionsRef.current.height));
    rowCountAvailableRef.current           =        rowCountAvailable_(dimensionsAvailable, fullItemDimensionsRef.current.height);
    const currentItemsShownCountRef        = useRef(currentItemsShownCount_(rowCountAvailableRef.current, columnCountAvailableRef.current));
    currentItemsShownCountRef.current      =        currentItemsShownCount_(rowCountAvailableRef.current, columnCountAvailableRef.current);
    const shownEndIndexRef                 = useRef(shownEndIndex_(shownStartIndex, currentItemsShownCountRef.current));
    shownEndIndexRef.current               =        shownEndIndex_(shownStartIndex, currentItemsShownCountRef.current);
    const lastPossibleShownStartIndexRef   = useRef(lastPossibleShownStartIndex_(columnCountAvailableRef.current, currentItemsShownCountRef.current, values.length));
    lastPossibleShownStartIndexRef.current =        lastPossibleShownStartIndex_(columnCountAvailableRef.current, currentItemsShownCountRef.current, values.length);

    /** @type {{current: number | null}} */
    const lastClickedIndex = useRef(initialLastClickedIndex);
    const updateLastClickedIndex = (newLastClickedIndex, shownStartIndex) => {
        preShiftClickIndices.current = null;

        lastClickedIndex.current = newLastClickedIndex;

        if (lastClickedIndex.current === null || lastClickedIndex.current === newLastClickedIndex) {
            return;
        }

        if (lastClickedIndex.current < shownStartIndex) {
            setShownStartIndex(clampShownStartIndex(
                Math.floor(lastClickedIndex.current / columnCountAvailableRef.current) * columnCountAvailableRef.current,
                lastPossibleShownStartIndexRef.current,
                columnCountAvailableRef.current
            ));
        }
        if (lastClickedIndex.current > shownEndIndexRef.current) {
            setShownStartIndex(clampShownStartIndex(
                Math.ceil((lastClickedIndex.current - currentItemsShownCountRef.current) / columnCountAvailableRef.current) * columnCountAvailableRef.current,
                lastPossibleShownStartIndexRef.current,
                columnCountAvailableRef.current
            ));
        }
    }

    let selectableContentsWidth = dimensionsAvailable.width;
    if (typeof itemProperties.width === "number") {
        selectableContentsWidth = columnCountAvailableRef.current * fullItemDimensionsRef.current.width;
    }
    let selectableContentsHeight = dimensionsAvailable.height;
    if (typeof itemProperties.height === "number") {
        selectableContentsHeight = rowCountAvailableRef.current * fullItemDimensionsRef.current.height;
    }


    const clampedStartIndex = clampShownStartIndex(shownStartIndex, lastPossibleShownStartIndexRef.current, columnCountAvailableRef.current);
    if (shownStartIndex !== clampedStartIndex) {
        setShownStartIndex(clampedStartIndex);
    }

    /**
     * @param {Iterable<number>} forcedIndices
     * @param {Iterable<number>} allIndices
     * @param {RealizationMap<number, R>} currentRealizedValues
     * @param {T[]} values
     * @param {number} localValuesRealizationSync
     */
    const setToRealize = async (forcedIndices, allIndices, currentRealizedValues, values, localValuesRealizationSync) => {
        /** @type {{index: number, value: T}[]} */
        const absentValues = [];

        let mustDo = false;
        for (const index of forcedIndices) {
            if (currentRealizedValues.getStatus(index) === "empty") {
                mustDo = true;
                break;
            }
        }

        for (const index of allIndices) {
            if (currentRealizedValues.getStatus(index) === "empty") {
                absentValues.push({
                    index,
                    value: values[index]
                });
            }
        }
        if (absentValues.length < realizeMinimumCount && !mustDo) {
            return;
        }

        const valuesPromise = valuesRealizer(absentValues.map(absentValue => absentValue.value));
        if (valuesPromise instanceof Promise) {
            for (const absentValue of absentValues) {
                currentRealizedValues.setAwaiting(absentValue.index);
            }

            const valuesAwaited = await valuesPromise;

            if (localValuesRealizationSync === valuesRealizationSync.current) {
                for (let i = 0; i < absentValues.length; ++i) {
                    currentRealizedValues.set(absentValues[i].index, valuesAwaited[i]);
                }
            }
        } else {
            for (let i = 0; i < absentValues.length; ++i) {
                currentRealizedValues.set(absentValues[i].index, valuesPromise[i]);
            }
        }


        if (localValuesRealizationSync === valuesRealizationSync.current) {
            setRealizedValues({ref: currentRealizedValues});
        }
    }

    const valuesRealizationSync = useRef(0);
    const realizeItems = async (selectedIndices, realizedValues, values, shownStartIndex) => {
        /** @type {Set<number>} */
        const allIndices = new Set();
        const realizationRangeFrom = Math.max(0, shownStartIndex - valueRealizationRange * currentItemsShownCountRef.current);
        const realizationRangeTo = Math.min(values.length - 1, shownEndIndexRef.current + valueRealizationRange * currentItemsShownCountRef.current);
        
        const forcedIndices = new Set();

        if (realizeSelectedValues) {
            for (const index of selectedIndices) {
                forcedIndices.add(index);
                allIndices.add(index);
            }
        }

        for (let i = shownStartIndex; i <= shownEndIndexRef.current && i < values.length; ++i) {
            forcedIndices.add(i);
            allIndices.add(i);
        }
        for (let i = realizationRangeFrom; i <= realizationRangeTo; ++i) {
            allIndices.add(i);
        }
        await setToRealize(forcedIndices, allIndices, realizedValues, values, valuesRealizationSync.current);
    };

    const scrollbarSetItemPositionOut = {out: () => {}};
    useEffect(() => {
        scrollbarSetItemPositionOut.out(shownStartIndex);
    }, [shownStartIndex]);

    const dimensionsAvailableRef = useRef(dimensionsAvailable);
    dimensionsAvailableRef.current = dimensionsAvailable;
    useEffect(() => {
        const onResize = () => {
            const parent = document.getElementById(LAZY_SELECTOR_ID).parentElement;
            const newDimensionsAvailable = {width: parent.clientWidth, height: Math.max(20, parent.clientHeight)};
            if (newDimensionsAvailable.width !== dimensionsAvailableRef.current.width || newDimensionsAvailable.height !== dimensionsAvailableRef.current.height) {
                dimensionsAvailableRef.current = newDimensionsAvailable;
                setDimensionsAvailable(dimensionsAvailableRef.current);
            }
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
            window.removeEventListener("resize", onResize);
            window.removeEventListener("click", onClickFocusOutListener);
        }
    }, []);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (!isClickFocused.current && elementsSelectable) {
                return;
            }

            let change = 0;
            if (e.key === "ArrowDown") {
                change = columnCountAvailableRef.current;
            } else if (e.key === "ArrowUp") {
                change = -columnCountAvailableRef.current;
            } else if (rowCountAvailableRef.current !== 1 || !elementsSelectable) {
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

            const newIndex = clamp(lastClickedIndex.current + change, 0, values.length - 1);
            if (newIndex !== lastClickedIndex.current) {
                updateLastClickedIndex(newIndex, shownStartIndex);
                setSelectedIndices(new Set([newIndex]));
            }
        }
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        }
    }, [values, shownStartIndex]);

    const realizedValuesRef = useRef(realizedValues);
    realizedValuesRef.current = realizedValues;
    useEffect(() => {
        preShiftClickIndices.current = null;
        if (selectedIndices.size !== 0) {
            setSelectedIndices(new Set());
        }

        updateLastClickedIndex(null);

        ++valuesRealizationSync.current;
        if (realizedValuesRef.current.ref.size() !== 0) {
            realizedValuesRef.current = {ref: new RealizationMap()};
            setRealizedValues(realizedValuesRef.current);
        }
    }, [values]);

    useEffect(() => {
        if (valueRealizationDelay === 0) {
            realizeItems(selectedIndices, realizedValuesRef.current.ref, values, shownStartIndex);
        } else {
            const timeoutHandle = setTimeout(() => realizeItems(selectedIndices, realizedValuesRef.current.ref, values, shownStartIndex), valueRealizationDelay);
            return () => {
                clearTimeout(timeoutHandle);
            };
        }
    }, [selectedIndices, shownStartIndex, values, dimensionsAvailable]);


    useEffect(() => {
        (async () => {
            /** @type {R[]} */
            const realizedValuesSelected = [];
            if (realizeSelectedValues) {
                for (const index of selectedIndices) {
                    realizedValuesSelected.push(await realizedValues.ref.get(index));
                }
            } else {
                for (const index of selectedIndices) {
                    realizedValuesSelected.push(realizedValues.ref.getOrUndefined(index));
                }
            }

            onValuesSelected(realizedValuesSelected, [...selectedIndices]);
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
                        for (let i = 0; i < rowCountAvailableRef.current; ++i) {
                            /** @type {JSX.Element[]} */
                            const rowItems = [];
                            for (let j = 0; j < columnCountAvailableRef.current; ++j) {
                                const itemIndex = (i * columnCountAvailableRef.current) + j + shownStartIndex;
                                const realizedValue = realizedValues.ref.getOrUndefined(itemIndex);
                                
                                if (realizedValue === undefined) {
                                    rowItems.push(<div className="lazy-selector-selectable-item" style={{
                                        width: itemProperties.width,
                                        height: itemProperties.height,
                                        marginTop: itemProperties.verticalMargin,
                                        marginBottom: itemProperties.verticalMargin,
                                        marginLeft: itemProperties.horizontalMargin,
                                        marginRight: itemProperties.horizontalMargin
                                    }}></div>);
                                } else {
                                    rowItems.push(
                                        <div className={`lazy-selector-selectable-item${elementsSelectable ? " selectable" : ""}${selectedIndices.has(itemIndex) ? " selected" : ""}`}
                                             title={customTitleRealizer(realizedValue)}
                                             style={{
                                                width: itemProperties.width,
                                                lineHeight: `${itemProperties.height}px`,
                                                height: itemProperties.height,
                                                marginTop: itemProperties.verticalMargin,
                                                marginBottom: itemProperties.verticalMargin,
                                                marginLeft: itemProperties.horizontalMargin,
                                                marginRight: itemProperties.horizontalMargin
                                            }}
                                             onClick={e => {
                                                if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                                    return;
                                                }
                                                let newSelectedIndices;

                                                if (!multiSelect) {
                                                    updateLastClickedIndex(itemIndex, shownStartIndex);
                                                    setSelectedIndices(new Set([itemIndex]));
                                                } else if (e.ctrlKey) {
                                                    updateLastClickedIndex(itemIndex, shownStartIndex);
                                                    newSelectedIndices = selectedIndices;
                                                    if (selectedIndices.has(itemIndex)) {
                                                        newSelectedIndices.delete(itemIndex);
                                                    } else {
                                                        newSelectedIndices.add(itemIndex);
                                                    }
                                                } else if (e.shiftKey) {
                                                    if (preShiftClickIndices.current === null) {
                                                        newSelectedIndices = selectedIndices;
                                                        preShiftClickIndices.current = new Set(selectedIndices);
                                                    } else {
                                                        newSelectedIndices = new Set(preShiftClickIndices.current);
                                                    }
                                                    let from = lastClickedIndex.current;
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
                                                    updateLastClickedIndex(itemIndex, shownStartIndex);
                                                    newSelectedIndices = new Set([itemIndex]);
                                                }

                                                if (newSelectedIndices !== undefined) {
                                                    setSelectedIndices(new Set(newSelectedIndices));
                                                }
                                             }}
                                             onDoubleClick={async (e) => {
                                                if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                                    return;
                                                }

                                                /** @type {R[]} */
                                                const realizedValuesDoubleClicked = [];
                                                if (realizeSelectedValues) {
                                                    for (const index of selectedIndices) {
                                                        realizedValuesDoubleClicked.push(await realizedValues.ref.get(index));
                                                    }
                                                } else {
                                                    for (const index of selectedIndices) {
                                                        realizedValuesDoubleClicked.push(realizedValues.ref.getOrUndefined(index));
                                                    }
                                                }

                                                onValuesDoubleClicked(realizedValuesDoubleClicked, [...selectedIndices], itemIndex);
                                             }}
                                        >
                                            {customItemComponent({realizedValue, index: itemIndex, setRealizedValue: (realizedValue) => {
                                                realizedValues.ref.set(itemIndex, realizedValue);
                                                setRealizedValues({ref: realizedValues.ref});
                                            }})}
                                        </div>
                                    );
                                }
                            }

                            rows.push(<div style={{width: "100%", height: fullItemDimensionsRef.current.height}}>
                                {rowItems}
                            </div>);
                        }

                        return rows;
                    })()}
                </div>
                <Scrollbar length={selectableContentsHeight}
                           itemsDisplayed={currentItemsShownCountRef.current}
                           totalItems={values.length}
                           setItemPositionOut={scrollbarSetItemPositionOut}
                           alternativeScrollingElements={SCROLLABLE_ELEMENTS}
                           scrollbarInterval={columnCountAvailableRef.current}
                           scrollbarIncrement={columnCountAvailableRef.current * scrollbarIncrement}
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