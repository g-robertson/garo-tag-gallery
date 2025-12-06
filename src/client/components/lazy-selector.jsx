import '../global.css';
import { clamp, concatCallback, RealizationMap, ReferenceableReact } from '../js/client-util.js';
import { ExistingState } from '../page/pages.js';
import Scrollbar from './scrollbar.jsx';

/** @import {ExistingStateRef, ExistingStateConstRef} from "../page/pages.js" */

/** @import {JSX} from "react" */

/**
 * @typedef {Object} ItemProperties
 * @property {number | "100%"} width
 * @property {number | "100%"} height
 * @property {number=} horizontalMargin
 * @property {number=} verticalMargin
 */

/**
 * @template T
 * @typedef {Object} SelectValue
 * @property {T} value
 */

/**
 * @param {number} shownStartIndex 
 * @param {number} lastPossibleShownStartIndex 
 * @param {number} columnCountAvailable
 */
function clampShownStartIndex(shownStartIndex, lastPossibleShownStartIndex, columnCountAvailable) {
    if (columnCountAvailable === 0) {
        return shownStartIndex;
    }
    if (lastPossibleShownStartIndex < 0) {
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
 *  valuesConstRef: ExistingStateConstRef<T[]>
 *  onValuesSelected?: (realizedValuesSelected: Awaited<R>[], indices: number[]) => void
 *  onValuesDoubleClicked?: (realizedValuesSelected: Awaited<R>[], indices: number[], indexClicked: number) => void
 *  valuesRealizer: ((values: T[]) => Promise<R[]>) | ((values: T[]) => R[])
 *  realizeSelectedValues?: boolean
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
 *  allowScrollInput?: boolean
 *  allowKeyboardInput?: boolean
 * }} param0
 */
function LazySelector({
    valuesConstRef,
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
    elementsSelectable,
    allowScrollInput,
    allowKeyboardInput
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
    allowScrollInput ??= true;
    allowKeyboardInput ??= true;

    const RootElement = ReferenceableReact();
    const SelectableContents = ReferenceableReact();
    /** @type {ExistingStateRef<Map<number, ReturnType<ReferenceableReact>} */
    const rowItemElementsRef = ExistingState.stateRef(new Map());

    const widthAvailableRef = ExistingState.stateRef(0);
    const heightAvailableRef = ExistingState.stateRef(0);
    /** @type {ExistingStateRef<RealizationMap<number, R>>} */
    const realizedValuesRef = ExistingState.stateRef(new RealizationMap());
    const shownStartIndexRef = ExistingState.stateRef(initialLastClickedIndex ?? 0);

    /** @type {ExistingStateRef<Set<number> | null>} */
    const preShiftClickIndices = ExistingState.stateRef(null);
    /** @type {ExistingStateRef<Set<number>>} */
    const selectedIndicesRef = ExistingState.stateRef(new Set());

    const isClickFocusedRef = ExistingState.stateRef(false);

    const fullItemWidthRef = widthAvailableRef.getTransformRef(widthAvailable => {
        if (typeof itemProperties.width === "number") {
            return itemProperties.width + (2 * itemProperties.horizontalMargin);
        }
        return widthAvailable;
    });
    const fullItemHeightRef = heightAvailableRef.getTransformRef(heightAvailable => {
        if (typeof itemProperties.height === "number") {
            return itemProperties.height + (2 * itemProperties.horizontalMargin);
        }
        return heightAvailable;
    });

    const columnCountAvailableRef = ExistingState.tupleTransformRef([widthAvailableRef, fullItemWidthRef], () => {
        if (fullItemWidthRef.get() === 0) {
            return 0;
        }
        return Math.floor(widthAvailableRef.get() / fullItemWidthRef.get());
    });
    const rowCountAvailableRef = ExistingState.tupleTransformRef([heightAvailableRef, fullItemHeightRef], () => {
        if (fullItemHeightRef.get() === 0) {
            return 0;
        }
        return Math.floor(heightAvailableRef.get() / fullItemHeightRef.get());
    });
    const rootElementWidthRef = ExistingState.tupleTransformRef([columnCountAvailableRef, fullItemWidthRef, widthAvailableRef], () => {
        if (typeof itemProperties.width === "number") {
            return columnCountAvailableRef.get() * fullItemWidthRef.get();
        }
        return widthAvailableRef.get();
    }) 
    const rootElementHeightRef = ExistingState.tupleTransformRef([rowCountAvailableRef, fullItemHeightRef, heightAvailableRef], () => {
        if (typeof itemProperties.height === "number") {
            return rowCountAvailableRef.get() * fullItemHeightRef.get();
        }
        return heightAvailableRef.get();
    }) 
    const currentItemsShownCountRef = ExistingState.tupleTransformRef([rowCountAvailableRef, columnCountAvailableRef], () => {
        return rowCountAvailableRef.get() * columnCountAvailableRef.get();
    });
    const shownEndIndexRef = ExistingState.tupleTransformRef([shownStartIndexRef, currentItemsShownCountRef], () => {
        return shownStartIndexRef.get() + currentItemsShownCountRef.get() - 1;
    });
    const lastPossibleShownStartIndexRef = ExistingState.tupleTransformRef([columnCountAvailableRef, currentItemsShownCountRef, valuesConstRef], () => {
        if (columnCountAvailableRef.get() === 0) {
            return 0;
        }

        return Math.max((columnCountAvailableRef.get() * Math.ceil(valuesConstRef.get().length / columnCountAvailableRef.get())) - currentItemsShownCountRef.get(), 0);
    });

    /** @type {ExistingStateRef<number | null>} */
    const lastClickedIndexRef = ExistingState.stateRef(initialLastClickedIndex);

    const valuesRealizationSync = ExistingState.stateRef(0);
    /**
     * @param {Iterable<number>} forcedIndices
     * @param {Iterable<number>} allIndices
     * @param {RealizationMap<number, R>} realizedValues
     */
    const setToRealize = async (forcedIndices, allIndices, realizedValues) => {
        const localValuesRealizationSync = valuesRealizationSync.get();
        const values = valuesConstRef.get();
        /** @type {{index: number, value: T}[]} */
        const absentValues = [];

        let mustDo = false;
        for (const index of forcedIndices) {
            if (realizedValues.getStatus(index) === "empty") {
                mustDo = true;
                break;
            }
        }

        for (const index of allIndices) {
            if (realizedValues.getStatus(index) === "empty") {
                absentValues.push({
                    index,
                    value: values[index]
                });
            }
        }
        if (absentValues.length <= realizeMinimumCount && !mustDo) {
            if (realizedValuesRef.get() !== realizedValues) {
                realizedValuesRef.update(realizedValues);
            }
            return;
        }

        const valuesPromise = valuesRealizer(absentValues.map(absentValue => absentValue.value));
        if (valuesPromise instanceof Promise) {
            for (const absentValue of absentValues) {
                realizedValues.setAwaiting(absentValue.index);
            }

            const valuesAwaited = await valuesPromise;

            if (localValuesRealizationSync === valuesRealizationSync.get()) {
                for (let i = 0; i < absentValues.length; ++i) {
                    realizedValues.set(absentValues[i].index, valuesAwaited[i]);
                }
            }
        } else {
            for (let i = 0; i < absentValues.length; ++i) {
                realizedValues.set(absentValues[i].index, valuesPromise[i]);
            }
        }

        if (localValuesRealizationSync === valuesRealizationSync.get()) {
            realizedValuesRef.update(realizedValues);
        }
    }

    /**
     *  @param {RealizationMap<number, R>} realizedValues
     */
    const realizeItems = async (realizedValues) => {
        /** @type {Set<number>} */
        const allIndices = new Set();
        const realizationRangeFrom = Math.max(0, shownStartIndexRef.get() - valueRealizationRange * currentItemsShownCountRef.get());
        const realizationRangeTo = Math.min(valuesConstRef.get().length - 1, shownEndIndexRef.get() + valueRealizationRange * currentItemsShownCountRef.get());
        
        const forcedIndices = new Set();

        if (realizeSelectedValues) {
            for (const index of selectedIndicesRef.get()) {
                forcedIndices.add(index);
                allIndices.add(index);
            }
        }

        for (let i = shownStartIndexRef.get(); i <= shownEndIndexRef.get() && i < valuesConstRef.get().length; ++i) {
            forcedIndices.add(i);
            allIndices.add(i);
        }
        for (let i = realizationRangeFrom; i <= realizationRangeTo; ++i) {
            allIndices.add(i);
        }
        await setToRealize(forcedIndices, allIndices, realizedValues);
    };

    const onAdd = () => {
        let cleanup = () => {};
        
        let timeoutHandle = undefined;
        /**
         *  @param {RealizationMap<number, R>=} realizedValues
         */
        const onRealizationUpdateNeeded = (realizedValues) => {
            realizedValues ??= realizedValuesRef.get();

            clearTimeout(timeoutHandle);
            if (valueRealizationDelay === 0) {
                realizeItems(realizedValues);
            } else {
                timeoutHandle = setTimeout(() => realizeItems(realizedValues), valueRealizationDelay);
            }
        }
        
        cleanup = selectedIndicesRef.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, cleanup);
        cleanup = columnCountAvailableRef.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, cleanup, {requireChangeForUpdate: true});
        cleanup = rowCountAvailableRef.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, cleanup, {requireChangeForUpdate: true});
        cleanup = shownStartIndexRef.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, cleanup, {requireChangeForUpdate: true});

        const onValuesChange = () => {
            preShiftClickIndices.update(null);
            selectedIndicesRef.update(new Set());
            lastClickedIndexRef.update(null);
            valuesRealizationSync.update(valuesRealizationSync.get() + 1);

            onRealizationUpdateNeeded(new RealizationMap());
        };
        onValuesChange();
        cleanup = valuesConstRef.addOnUpdateCallback(onValuesChange, cleanup);
        
        const onRowItemsSelectedChanged = () => {
            for (const rowItemElement of rowItemElementsRef.get().values()) {
                if (rowItemElement.dom) {
                    rowItemElement.dom.classList.remove("selected");
                }
            }

            for (const index of selectedIndicesRef.get()) {
                const rowItemElement = rowItemElementsRef.get().get(index)?.dom;
                if (rowItemElement) {
                    rowItemElement.classList.add("selected");
                }
            }
        }
        const onSelectedIndicesChanged = async () => {
            const realizedValues = realizedValuesRef.get();
            /** @type {R[]} */
            const realizedValuesSelected = [];

            if (realizeSelectedValues) {
                for (const index of selectedIndicesRef.get()) {
                    realizedValuesSelected.push(await realizedValues.get(index));
                }
            } else {
                for (const index of selectedIndicesRef.get()) {
                    realizedValuesSelected.push(realizedValues.getOrUndefined(index));
                }
            }

            onValuesSelected(realizedValuesSelected, [...selectedIndicesRef.get()]);
        };
        cleanup = selectedIndicesRef.addOnUpdateCallback(onSelectedIndicesChanged, cleanup);
        cleanup = selectedIndicesRef.addOnUpdateCallback(onRowItemsSelectedChanged, cleanup);
        cleanup = rowItemElementsRef.addOnUpdateCallback(onRowItemsSelectedChanged, cleanup);
        
        const onLastClickedIndexChanged = () => {
            preShiftClickIndices.update(null);

            if (lastClickedIndexRef.get() === null) {
                return;
            }
            
            if (lastClickedIndexRef.get() < shownStartIndexRef.get()) {
                shownStartIndexRef.update(clampShownStartIndex(
                    Math.floor(lastClickedIndexRef.get() / columnCountAvailableRef.get()) * columnCountAvailableRef.get(),
                    lastPossibleShownStartIndexRef.get(),
                    columnCountAvailableRef.get()
                ));
            }
            if (lastClickedIndexRef.get() > shownEndIndexRef.get()) {
                shownStartIndexRef.update(clampShownStartIndex(
                    Math.ceil((lastClickedIndexRef.get() - currentItemsShownCountRef.get() + 1) / columnCountAvailableRef.get()) * columnCountAvailableRef.get(),
                    lastPossibleShownStartIndexRef.get(),
                    columnCountAvailableRef.get()
                ));
            }
        };
        cleanup = lastClickedIndexRef.addOnUpdateCallback(onLastClickedIndexChanged, cleanup, {requireChangeForUpdate: true});

        const onShownStartIndexClampConditionsChange = () => {
            shownStartIndexRef.update(clampShownStartIndex(
                shownStartIndexRef.get(),
                lastPossibleShownStartIndexRef.get(),
                columnCountAvailableRef.get()
            ));
        };
        cleanup = lastPossibleShownStartIndexRef.addOnUpdateCallback(onShownStartIndexClampConditionsChange, cleanup, {requireChangeForUpdate: true});
        cleanup = columnCountAvailableRef.addOnUpdateCallback(onShownStartIndexClampConditionsChange, cleanup, {requireChangeForUpdate: true});

        const onActiveRealizedValuesChanged = () => {
            const realizedValues = realizedValuesRef.get();
            const rowItemElements = new Map();
            /** @type {JSX.Element[]} */
            const rows = [];
            for (let i = 0; i < rowCountAvailableRef.get(); ++i) {
                /** @type {JSX.Element[]} */
                const rowItems = [];
                for (let j = 0; j < columnCountAvailableRef.get(); ++j) {
                    const itemIndex = (i * columnCountAvailableRef.get()) + j + shownStartIndexRef.get();
                    const realizedValue = realizedValues.getOrUndefined(itemIndex);
                    const rowItemElement = ReferenceableReact();

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
                            rowItemElement.react(<div className={`lazy-selector-selectable-item${elementsSelectable ? " selectable" : ""}`}
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
                                        const selectedIndices = selectedIndicesRef.get();
                                        let newSelectedIndices;

                                        if (!multiSelect) {
                                            lastClickedIndexRef.update(itemIndex);
                                            selectedIndices.clear();
                                            selectedIndices.add(itemIndex);
                                            selectedIndicesRef.forceUpdate();
                                        } else if (e.ctrlKey) {
                                            lastClickedIndexRef.update(itemIndex);
                                            newSelectedIndices = selectedIndices;
                                            if (newSelectedIndices.has(itemIndex)) {
                                                newSelectedIndices.delete(itemIndex);
                                            } else {
                                                newSelectedIndices.add(itemIndex);
                                            }
                                        } else if (e.shiftKey) {
                                            // Maintains prior state from before shift click
                                            if (preShiftClickIndices.get() === null) {
                                                preShiftClickIndices.update(new Set(selectedIndices));
                                                newSelectedIndices = selectedIndices;
                                            } else {
                                                newSelectedIndices = new Set(preShiftClickIndices.get());
                                            }

                                            let from = lastClickedIndexRef.get();
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
                                            lastClickedIndexRef.update(itemIndex);
                                            newSelectedIndices = new Set([itemIndex]);
                                        }

                                        if (newSelectedIndices !== undefined) {
                                            selectedIndicesRef.update(newSelectedIndices);
                                        }
                                    }}
                                    onDoubleClick={async (e) => {
                                        if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                            return;
                                        }

                                        /** @type {R[]} */
                                        const realizedValuesDoubleClicked = [];
                                        if (realizeSelectedValues) {
                                            for (const index of selectedIndicesRef.get()) {
                                                realizedValuesDoubleClicked.push(await realizedValues.get(index));
                                            }
                                        } else {
                                            for (const index of selectedIndicesRef.get()) {
                                                realizedValuesDoubleClicked.push(realizedValues.getOrUndefined(index));
                                            }
                                        }

                                        onValuesDoubleClicked(realizedValuesDoubleClicked, [...selectedIndicesRef.get()], itemIndex);
                                    }}
                            >
                                {customItemComponent({realizedValue, index: itemIndex, setRealizedValue: (realizedValue) => {
                                    realizedValues.set(itemIndex, realizedValue);
                                    realizedValuesRef.update(realizedValues);
                                }})}
                            </div>)
                        );

                        rowItemElements.set(itemIndex, rowItemElement);
                    }
                }
                rowItemElementsRef.update(rowItemElements);


                rows.push(<div style={{width: "100%", height: fullItemHeightRef.get()}}>
                    {rowItems}
                </div>);
            }

            SelectableContents.dom.replaceChildren(...(<dom>
                {rows}
            </dom>));
        };
        cleanup = realizedValuesRef.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), cleanup);
        cleanup = rowCountAvailableRef.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), cleanup, {requireChangeForUpdate: true});
        cleanup = columnCountAvailableRef.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), cleanup, {requireChangeForUpdate: true});
        cleanup = shownStartIndexRef.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), cleanup, {requireChangeForUpdate: true});

        const onRootElementWidthChanged = () => {
            RootElement.dom.style.width = `${rootElementWidthRef.get()}px`;
        }
        cleanup = rootElementWidthRef.addOnUpdateCallback(onRootElementWidthChanged, cleanup, {requireChangeForUpdate: true});

        const onRootElementHeightChanged = () => {
            RootElement.dom.style.height = `${rootElementHeightRef.get()}px`;
        }
        cleanup = rootElementHeightRef.addOnUpdateCallback(onRootElementHeightChanged, cleanup, {requireChangeForUpdate: true});

        const onResize = () => {
            const parent = RootElement.dom.parentElement;
            widthAvailableRef.update(parent.clientWidth);
            heightAvailableRef.update(Math.max(20, parent.clientHeight));
        };
        onResize();
        window.addEventListener("resize", onResize);
        cleanup = concatCallback(cleanup, () => window.removeEventListener("resize", onResize));

        const onClickFocusOutListener = (e) => {
            let parent = e.target;
            do {
                if (parent === RootElement.dom) {
                    return;
                }
                parent = parent.parentElement;
            } while (parent !== null && parent !== undefined);
            isClickFocusedRef.update(false);
        }
        RootElement.dom.addEventListener("click", () => {
            isClickFocusedRef.update(true);
        });
        window.addEventListener("click", onClickFocusOutListener);
        cleanup = concatCallback(cleanup, () => window.removeEventListener("click", onClickFocusOutListener));

        if (allowKeyboardInput) {
            const onKeyDown = (e) => {
                if (!isClickFocusedRef.get() && elementsSelectable) {
                    return;
                }

                let change = 0;
                if (e.key === "ArrowDown") {
                    change = columnCountAvailableRef.get();
                } else if (e.key === "ArrowUp") {
                    change = -columnCountAvailableRef.get();
                } else if (rowCountAvailableRef.get() !== 1 || !elementsSelectable) {
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

                const newIndex = clamp(lastClickedIndexRef.get() + change, 0, valuesConstRef.get().length - 1);
                if (newIndex !== lastClickedIndexRef.get()) {
                    lastClickedIndexRef.update(newIndex);
                    const selectedIndices = selectedIndicesRef.get();
                    selectedIndices.clear();
                    selectedIndices.add(newIndex);
                    selectedIndicesRef.forceUpdate();
                }
            };
            window.addEventListener("keydown", onKeyDown);
            cleanup = concatCallback(cleanup, () => window.removeEventListener("keydown", onKeyDown));
        }
        return cleanup;
    };

    const SCROLLABLE_ELEMENTS = [SelectableContents];

    return RootElement.react(
        <div style={{position: "absolute"}} className="lazy-select" onAdd={onAdd}>
            <div style={{width: "100%", height: "100%"}}>
                {SelectableContents.react(
                    <div className="lazy-selector-selectable-contents" style={{width: `calc(100% - ${scrollbarWidth}px)`, height: "100%", float: "left", flexDirection: "column"}}>
                    </div>
                )}
                {
                    allowScrollInput
                    ? <Scrollbar lengthConstRef={rootElementHeightRef}
                           itemsDisplayedConstRef={currentItemsShownCountRef}
                           totalItemsConstRef={valuesConstRef.getTransformRef(values => values.length)}
                           itemPositionRef={shownStartIndexRef}
                           alternativeScrollingElements={SCROLLABLE_ELEMENTS}
                           scrollbarIntervalConstRef={columnCountAvailableRef}
                           scrollbarIncrementConstRef={columnCountAvailableRef.getTransformRef(columnCountAvailable => columnCountAvailable * scrollbarIncrement)}
                           scrollbarWidth={scrollbarWidth}
                           onScrollbarUpdate={(e) => {
                               shownStartIndexRef.update(e);
                           }}
                    /> : <></>
                }
            </div>
        </div>
    );
};

export default LazySelector;