import '../global.css';
import { clamp, executeFunctions, RealizationMap, ReferenceableReact } from '../js/client-util.js';
import { State } from '../page/pages.js';
import Scrollbar from './scrollbar.jsx';

/** @import {State, ConstState} from "../page/pages.js" */

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
 *  valuesConstState: ConstState<T[]>
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
    valuesConstState,
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
    /** @type {(() => void)[]} */
    const addToCleanup = [];

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
    /** @type {State<Map<number, ReturnType<ReferenceableReact>} */
    const rowItemElementsState = new State(new Map());

    const widthAvailableState = new State(0);
    const heightAvailableState = new State(0);
    /** @type {State<RealizationMap<number, R>>} */
    const realizedValuesState = new State(new RealizationMap());
    const shownStartIndexState = new State(initialLastClickedIndex ?? 0);

    /** @type {State<Set<number> | null>} */
    const preShiftClickIndicesState = new State(null);
    /** @type {State<Set<number>>} */
    const selectedIndicesState = new State(new Set());

    const isClickFocusedState = new State(false);

    const fullItemWidthState = widthAvailableState.asTransform(widthAvailable => {
        if (typeof itemProperties.width === "number") {
            return itemProperties.width + (2 * itemProperties.horizontalMargin);
        }
        return widthAvailable;
    }, addToCleanup);
    const fullItemHeightState = heightAvailableState.asTransform(heightAvailable => {
        if (typeof itemProperties.height === "number") {
            return itemProperties.height + (2 * itemProperties.horizontalMargin);
        }
        return heightAvailable;
    }, addToCleanup);

    const columnCountAvailableState = State.tupleTransform([widthAvailableState, fullItemWidthState], () => {
        if (fullItemWidthState.get() === 0) {
            return 0;
        }
        return Math.floor(widthAvailableState.get() / fullItemWidthState.get());
    }, addToCleanup);
    const rowCountAvailableState = State.tupleTransform([heightAvailableState, fullItemHeightState], () => {
        if (fullItemHeightState.get() === 0) {
            return 0;
        }
        return Math.floor(heightAvailableState.get() / fullItemHeightState.get());
    }, addToCleanup);
    const rootElementWidthState = State.tupleTransform([columnCountAvailableState, fullItemWidthState, widthAvailableState], () => {
        if (typeof itemProperties.width === "number") {
            return columnCountAvailableState.get() * fullItemWidthState.get();
        }
        return widthAvailableState.get();
    }, addToCleanup) 
    const rootElementHeightState = State.tupleTransform([rowCountAvailableState, fullItemHeightState, heightAvailableState], () => {
        if (typeof itemProperties.height === "number") {
            return rowCountAvailableState.get() * fullItemHeightState.get();
        }
        return heightAvailableState.get();
    }, addToCleanup) 
    const currentItemsShownCountState = State.tupleTransform([rowCountAvailableState, columnCountAvailableState], () => {
        return rowCountAvailableState.get() * columnCountAvailableState.get();
    }, addToCleanup);
    const shownEndIndexState = State.tupleTransform([shownStartIndexState, currentItemsShownCountState], () => {
        return shownStartIndexState.get() + currentItemsShownCountState.get() - 1;
    }, addToCleanup);
    const lastPossibleShownStartIndexState = State.tupleTransform([columnCountAvailableState, currentItemsShownCountState, valuesConstState], () => {
        if (columnCountAvailableState.get() === 0) {
            return 0;
        }

        return Math.max((columnCountAvailableState.get() * Math.ceil(valuesConstState.get().length / columnCountAvailableState.get())) - currentItemsShownCountState.get(), 0);
    }, addToCleanup);

    /** @type {State<number | null>} */
    const lastClickedIndexState = new State(initialLastClickedIndex);

    const valuesRealizationSyncState = new State(0);
    /**
     * @param {Iterable<number>} forcedIndices
     * @param {Iterable<number>} allIndices
     * @param {RealizationMap<number, R>} realizedValues
     */
    const setToRealize = async (forcedIndices, allIndices, realizedValues) => {
        const localValuesRealizationSyncState = valuesRealizationSyncState.get();
        const values = valuesConstState.get();
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
            if (realizedValuesState.get() !== realizedValues) {
                realizedValuesState.set(realizedValues);
            }
            return;
        }

        const valuesPromise = valuesRealizer(absentValues.map(absentValue => absentValue.value));
        if (valuesPromise instanceof Promise) {
            for (const absentValue of absentValues) {
                realizedValues.setAwaiting(absentValue.index);
            }

            const valuesAwaited = await valuesPromise;

            if (localValuesRealizationSyncState === valuesRealizationSyncState.get()) {
                for (let i = 0; i < absentValues.length; ++i) {
                    realizedValues.set(absentValues[i].index, valuesAwaited[i]);
                }
            }
        } else {
            for (let i = 0; i < absentValues.length; ++i) {
                realizedValues.set(absentValues[i].index, valuesPromise[i]);
            }
        }

        if (localValuesRealizationSyncState === valuesRealizationSyncState.get()) {
            realizedValuesState.set(realizedValues);
        }
    }

    /**
     *  @param {RealizationMap<number, R>} realizedValues
     */
    const realizeItems = async (realizedValues) => {
        /** @type {Set<number>} */
        const allIndices = new Set();
        const realizationRangeFrom = Math.max(0, shownStartIndexState.get() - valueRealizationRange * currentItemsShownCountState.get());
        const realizationRangeTo = Math.min(valuesConstState.get().length - 1, shownEndIndexState.get() + valueRealizationRange * currentItemsShownCountState.get());
        
        const forcedIndices = new Set();

        if (realizeSelectedValues) {
            for (const index of selectedIndicesState.get()) {
                forcedIndices.add(index);
                allIndices.add(index);
            }
        }

        for (let i = shownStartIndexState.get(); i <= shownEndIndexState.get() && i < valuesConstState.get().length; ++i) {
            forcedIndices.add(i);
            allIndices.add(i);
        }
        for (let i = realizationRangeFrom; i <= realizationRangeTo; ++i) {
            allIndices.add(i);
        }
        await setToRealize(forcedIndices, allIndices, realizedValues);
    };

    const onAdd = () => {
                
        let timeoutHandle = undefined;
        /**
         *  @param {RealizationMap<number, R>=} realizedValues
         */
        const onRealizationUpdateNeeded = (realizedValues) => {
            realizedValues ??= realizedValuesState.get();

            clearTimeout(timeoutHandle);
            if (valueRealizationDelay === 0) {
                realizeItems(realizedValues);
            } else {
                timeoutHandle = setTimeout(() => realizeItems(realizedValues), valueRealizationDelay);
            }
        }
        
        selectedIndicesState.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, addToCleanup);
        columnCountAvailableState.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, addToCleanup, {requireChangeForUpdate: true});
        rowCountAvailableState.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, addToCleanup, {requireChangeForUpdate: true});
        shownStartIndexState.addOnUpdateCallback(() => {onRealizationUpdateNeeded()}, addToCleanup, {requireChangeForUpdate: true});

        const onValuesChange = () => {
            preShiftClickIndicesState.set(null);
            selectedIndicesState.set(new Set());
            lastClickedIndexState.set(null);
            valuesRealizationSyncState.set(valuesRealizationSyncState.get() + 1);

            onRealizationUpdateNeeded(new RealizationMap());
        };
        onValuesChange();
        valuesConstState.addOnUpdateCallback(onValuesChange, addToCleanup);
        
        const onRowItemsSelectedChanged = () => {
            for (const rowItemElement of rowItemElementsState.get().values()) {
                if (rowItemElement.dom) {
                    rowItemElement.dom.classList.remove("selected");
                }
            }

            for (const index of selectedIndicesState.get()) {
                const rowItemElement = rowItemElementsState.get().get(index)?.dom;
                if (rowItemElement) {
                    rowItemElement.classList.add("selected");
                }
            }
        }
        const onSelectedIndicesChanged = async () => {
            const realizedValues = realizedValuesState.get();
            /** @type {R[]} */
            const realizedValuesSelected = [];

            if (realizeSelectedValues) {
                for (const index of selectedIndicesState.get()) {
                    realizedValuesSelected.push(await realizedValues.get(index));
                }
            } else {
                for (const index of selectedIndicesState.get()) {
                    realizedValuesSelected.push(realizedValues.getOrUndefined(index));
                }
            }

            onValuesSelected(realizedValuesSelected, [...selectedIndicesState.get()]);
        };
        selectedIndicesState.addOnUpdateCallback(onSelectedIndicesChanged, addToCleanup);
        selectedIndicesState.addOnUpdateCallback(onRowItemsSelectedChanged, addToCleanup);
        rowItemElementsState.addOnUpdateCallback(onRowItemsSelectedChanged, addToCleanup);
        
        const onLastClickedIndexChanged = () => {
            preShiftClickIndicesState.set(null);

            if (lastClickedIndexState.get() === null) {
                return;
            }
            
            if (lastClickedIndexState.get() < shownStartIndexState.get()) {
                shownStartIndexState.set(clampShownStartIndex(
                    Math.floor(lastClickedIndexState.get() / columnCountAvailableState.get()) * columnCountAvailableState.get(),
                    lastPossibleShownStartIndexState.get(),
                    columnCountAvailableState.get()
                ));
            }
            if (lastClickedIndexState.get() > shownEndIndexState.get()) {
                shownStartIndexState.set(clampShownStartIndex(
                    Math.ceil((lastClickedIndexState.get() - currentItemsShownCountState.get() + 1) / columnCountAvailableState.get()) * columnCountAvailableState.get(),
                    lastPossibleShownStartIndexState.get(),
                    columnCountAvailableState.get()
                ));
            }
        };
        lastClickedIndexState.addOnUpdateCallback(onLastClickedIndexChanged, addToCleanup, {requireChangeForUpdate: true});

        const onShownStartIndexClampConditionsChange = () => {
            shownStartIndexState.set(clampShownStartIndex(
                shownStartIndexState.get(),
                lastPossibleShownStartIndexState.get(),
                columnCountAvailableState.get()
            ));
        };
        lastPossibleShownStartIndexState.addOnUpdateCallback(onShownStartIndexClampConditionsChange, addToCleanup, {requireChangeForUpdate: true});
        columnCountAvailableState.addOnUpdateCallback(onShownStartIndexClampConditionsChange, addToCleanup, {requireChangeForUpdate: true});

        const onActiveRealizedValuesChanged = () => {
            const realizedValues = realizedValuesState.get();
            const rowItemElements = new Map();
            /** @type {JSX.Element[]} */
            const rows = [];
            for (let i = 0; i < rowCountAvailableState.get(); ++i) {
                /** @type {JSX.Element[]} */
                const rowItems = [];
                for (let j = 0; j < columnCountAvailableState.get(); ++j) {
                    const itemIndex = (i * columnCountAvailableState.get()) + j + shownStartIndexState.get();
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
                                        const selectedIndices = selectedIndicesState.get();
                                        let newSelectedIndices;

                                        if (!multiSelect) {
                                            lastClickedIndexState.set(itemIndex);
                                            selectedIndices.clear();
                                            selectedIndices.add(itemIndex);
                                            selectedIndicesState.forceUpdate();
                                        } else if (e.ctrlKey) {
                                            lastClickedIndexState.set(itemIndex);
                                            newSelectedIndices = selectedIndices;
                                            if (newSelectedIndices.has(itemIndex)) {
                                                newSelectedIndices.delete(itemIndex);
                                            } else {
                                                newSelectedIndices.add(itemIndex);
                                            }
                                        } else if (e.shiftKey) {
                                            // Maintains prior state from before shift click
                                            if (preShiftClickIndicesState.get() === null) {
                                                preShiftClickIndicesState.set(new Set(selectedIndices));
                                                newSelectedIndices = selectedIndices;
                                            } else {
                                                newSelectedIndices = new Set(preShiftClickIndicesState.get());
                                            }

                                            let from = lastClickedIndexState.get();
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
                                            lastClickedIndexState.set(itemIndex);
                                            newSelectedIndices = new Set([itemIndex]);
                                        }

                                        if (newSelectedIndices !== undefined) {
                                            selectedIndicesState.set(newSelectedIndices);
                                        }
                                    }}
                                    onDoubleClick={async (e) => {
                                        if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                            return;
                                        }

                                        /** @type {R[]} */
                                        const realizedValuesDoubleClicked = [];
                                        if (realizeSelectedValues) {
                                            for (const index of selectedIndicesState.get()) {
                                                realizedValuesDoubleClicked.push(await realizedValues.get(index));
                                            }
                                        } else {
                                            for (const index of selectedIndicesState.get()) {
                                                realizedValuesDoubleClicked.push(realizedValues.getOrUndefined(index));
                                            }
                                        }

                                        onValuesDoubleClicked(realizedValuesDoubleClicked, [...selectedIndicesState.get()], itemIndex);
                                    }}
                            >
                                {customItemComponent({realizedValue, index: itemIndex, setRealizedValue: (realizedValue) => {
                                    realizedValues.set(itemIndex, realizedValue);
                                    realizedValuesState.set(realizedValues);
                                }})}
                            </div>)
                        );

                        rowItemElements.set(itemIndex, rowItemElement);
                    }
                }


                rows.push(<div style={{width: "100%", height: fullItemHeightState.get()}}>
                    {rowItems}
                </div>);
            }

            SelectableContents.dom.replaceChildren(...(<dom>
                {rows}
            </dom>));

            rowItemElementsState.set(rowItemElements);
        };
        realizedValuesState.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), addToCleanup);
        rowCountAvailableState.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), addToCleanup, {requireChangeForUpdate: true});
        columnCountAvailableState.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), addToCleanup, {requireChangeForUpdate: true});
        shownStartIndexState.addOnUpdateCallback(() => onActiveRealizedValuesChanged(), addToCleanup, {requireChangeForUpdate: true});

        const onRootElementWidthChanged = () => {
            RootElement.dom.style.width = `${rootElementWidthState.get()}px`;
        }
        rootElementWidthState.addOnUpdateCallback(onRootElementWidthChanged, addToCleanup, {requireChangeForUpdate: true});

        const onRootElementHeightChanged = () => {
            RootElement.dom.style.height = `${rootElementHeightState.get()}px`;
        }
        rootElementHeightState.addOnUpdateCallback(onRootElementHeightChanged, addToCleanup, {requireChangeForUpdate: true});

        const onResize = () => {
            const parent = RootElement.dom.parentElement;
            widthAvailableState.set(parent.clientWidth);
            heightAvailableState.set(Math.max(20, parent.clientHeight));
        };
        onResize();
        window.addEventListener("resize", onResize);
        addToCleanup.push(() => window.removeEventListener("resize", onResize));

        const onClickFocusOutListener = (e) => {
            let parent = e.target;
            do {
                if (parent === RootElement.dom) {
                    return;
                }
                parent = parent.parentElement;
            } while (parent !== null && parent !== undefined);
            isClickFocusedState.set(false);
        }
        RootElement.dom.addEventListener("click", () => {
            isClickFocusedState.set(true);
        });
        window.addEventListener("click", onClickFocusOutListener);
        addToCleanup.push(() => window.removeEventListener("click", onClickFocusOutListener));

        if (allowKeyboardInput) {
            const onKeyDown = (e) => {
                if (!isClickFocusedState.get() && elementsSelectable) {
                    return;
                }

                let change = 0;
                if (e.key === "ArrowDown") {
                    change = columnCountAvailableState.get();
                } else if (e.key === "ArrowUp") {
                    change = -columnCountAvailableState.get();
                } else if (rowCountAvailableState.get() !== 1 || !elementsSelectable) {
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

                const newIndex = clamp(lastClickedIndexState.get() + change, 0, valuesConstState.get().length - 1);
                if (newIndex !== lastClickedIndexState.get()) {
                    lastClickedIndexState.set(newIndex);
                    const selectedIndices = selectedIndicesState.get();
                    selectedIndices.clear();
                    selectedIndices.add(newIndex);
                    selectedIndicesState.forceUpdate();
                }
            };
            window.addEventListener("keydown", onKeyDown);
            addToCleanup.push(() => window.removeEventListener("keydown", onKeyDown));
        }

        return () => executeFunctions(addToCleanup);
    };

    const SCROLLABLE_ELEMENTS = [SelectableContents];

    return RootElement.react(
        <div onAdd={onAdd} style={{position: "absolute"}} className="lazy-select">
            <div style={{width: "100%", height: "100%"}}>
                {SelectableContents.react(
                    <div className="lazy-selector-selectable-contents" style={{width: `calc(100% - ${scrollbarWidth}px)`, height: "100%", float: "left", flexDirection: "column"}}>
                    </div>
                )}
                {
                    allowScrollInput
                    ? <Scrollbar lengthConstState={rootElementHeightState}
                           itemsDisplayedConstState={currentItemsShownCountState}
                           totalItemsConstState={valuesConstState.asTransform(values => values.length, addToCleanup)}
                           itemPositionState={shownStartIndexState}
                           alternativeScrollingElements={SCROLLABLE_ELEMENTS}
                           scrollbarIntervalConstState={columnCountAvailableState}
                           scrollbarIncrementConstState={columnCountAvailableState.asTransform(columnCountAvailable => columnCountAvailable * scrollbarIncrement, addToCleanup)}
                           scrollbarWidth={scrollbarWidth}
                           onScrollbarUpdate={(e) => {
                               shownStartIndexState.set(e);
                           }}
                    /> : <></>
                }
            </div>
        </div>
    );
};

export default LazySelector;