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

const OPTION_HEIGHT = 20;

/**
 * @template T, R
 * @param {{
 *  values: T[]
 *  onValuesDoubleClicked?: (realizedValuesSelected: R[]) => void
 *  valueRealizer: (value: T) => R
 *  customItemComponent?: (param0: {realizedValue: R}) => JSX.Element
 *  customTitleRealizer?: (realizedValue: R) => string
 * }} param0
 */
const LazySelector = ({values, onValuesDoubleClicked, valueRealizer, customItemComponent, customTitleRealizer}) => {
    onValuesDoubleClicked ??= () => {};
    customItemComponent ??= ({realizedValue}) => (<>{realizedValue}</>);
    customTitleRealizer ??= (realizedValue) => realizedValue.title;

    const uniqueID = useRef(randomID(32));
    const [widthAvailable, setWidthAvailable] = useState(200);
    const [heightAvailable, setHeightAvailable] = useState(100);

    const realizedValues = values.map(valueRealizer);

    const optionShowCount = Math.floor(heightAvailable / OPTION_HEIGHT);
    const [shownStartIndex, setShownStartIndex] = useState(0);
    const shownEndIndex = shownStartIndex + optionShowCount - 1;

    const lastPossibleShownStartIndex = Math.max(values.length - optionShowCount, 0);

    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    /** @type {[Set<number> | null, (preShiftClickIndices: Set<number> | null) => void]} */
    const [preShiftClickIndices, setPreShiftClickIndices] = useState(null);
    /** @type {[Set<number>, (selectedIndices: Set<number>) => void]} */
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    const optionsRef = useRef(values);
    if (optionsRef.current.length !== values.length) {
        if (optionsRef.current.length > values.length) {
            setPreShiftClickIndices(null);
            setSelectedIndices(new Set());
            setLastClickedIndex(null);
        }

        optionsRef.current = values;
    }

    const selectableContentsHeight = optionShowCount * OPTION_HEIGHT;

    /** @type {(index: number => void)} */
    const getClampedOptionIndex = (index) => {
        if (index < 0) {
            return 0;
        } else if (index >= values.length) {
            return values.length - 1;
        } else {
            return index;
        }
    }

    const getClampedShownStartIndex = (shownStartIndex) => {
        if (shownStartIndex < 0) {
            return 0;
        } else if (shownStartIndex > lastPossibleShownStartIndex) {
            return lastPossibleShownStartIndex;
        } else {
            return shownStartIndex;
        }
    }

    const clampedStartIndex = getClampedShownStartIndex(shownStartIndex);
    if (shownStartIndex !== clampedStartIndex) {
        setShownStartIndex(clampedStartIndex);
    }

    const onResize = () => {
        const parent = document.getElementById(`lazy-selector-${uniqueID.current}`).parentElement;
        setWidthAvailable(parent.clientWidth);
        setHeightAvailable(Math.max(20, parent.clientHeight));
    };

    useEffect(() => {
        setPreShiftClickIndices(null);

        if (lastClickedIndex < shownStartIndex) {
            setShownStartIndex(getClampedShownStartIndex(lastClickedIndex));
        }
        if (lastClickedIndex > shownEndIndex) {
            setShownStartIndex(getClampedShownStartIndex(lastClickedIndex - optionShowCount + 1));
        }

        const listener = (e) => {
            let change = 0;
            if (e.key === "ArrowDown") {
                change = 1;
            } else if (e.key === "ArrowUp") {
                change = -1;
            } else {
                return;
            }

            const newIndex = getClampedOptionIndex(lastClickedIndex + change);
            if (newIndex !== lastClickedIndex) {
                setLastClickedIndex(newIndex);
                setSelectedIndices(new Set([newIndex]));
            }
        }
        document.addEventListener("keydown", listener);

        return () => {
            document.removeEventListener("keydown", listener);
        }
    }, [lastClickedIndex]);

    const scrollbarSetItemPositionOut = {out: () => {}};
    useEffect(() => {
        scrollbarSetItemPositionOut.out(shownStartIndex);
    }, [shownStartIndex]);

    useEffect(() => {
        window.addEventListener("resize", onResize);
        onResize();
        return () => {
            window.removeEventListener("resize", onResize);
        }
    }, []);

    const SELECTABLE_CONTENTS_ID = `lazy-selector-selectable-contents-${uniqueID.current}`
    const SCROLLABLE_ELEMENTS = [SELECTABLE_CONTENTS_ID];

    return (
        <div style={{position: "absolute", width: widthAvailable, height: selectableContentsHeight}} id={`lazy-selector-${uniqueID.current}`} class="lazy-select">
            <div style={{width: "100%", height: "100%"}}>
                <div id={SELECTABLE_CONTENTS_ID} className="lazy-selector-selectable-contents" style={{width: "calc(100% - 17px)", height: "100%", float: "left", flexDirection: "column"}}>
                    {(() => {
                        const selectableItems = [];
                        if (shownStartIndex < 0) {
                            return selectableItems;
                        }

                        for (let i = 0; i < optionShowCount; ++i) {
                            const itemIndex = i + shownStartIndex;

                            const realizedValue = realizedValues[itemIndex];
                            if (realizedValue === undefined) {
                                selectableItems.push(<div className="lazy-selector-selectable-item" style={{width: "100%", height: OPTION_HEIGHT}}></div>);
                            } else {
                                selectableItems.push(
                                    <div className={`lazy-selector-selectable-item selectable${selectedIndices.has(itemIndex) ? " selected" : ""}`}
                                         title={customTitleRealizer(realizedValue)}
                                         style={{width: "100%", lineHeight: `${OPTION_HEIGHT}px`, height: OPTION_HEIGHT}}
                                         onClick={e => {
                                            if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                                return;
                                            }
                                            let newSelectedIndices;

                                            if (e.ctrlKey) {
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
                                         onDoubleClick={e => {
                                            if (!e.target.classList.contains("lazy-selector-selectable-item") && !e.target.classList.contains("lazy-selector-selectable-item-portion")) {
                                                return;
                                            }

                                            const realizedValuesDoubleClicked = [];
                                            for (const index of selectedIndices) {
                                                if (realizedValues[index] === undefined) {
                                                    realizedValues[index] = valueRealizer(values[index]);
                                                }

                                                realizedValuesDoubleClicked.push(realizedValues[index]);
                                            }

                                            onValuesDoubleClicked(realizedValuesDoubleClicked);
                                         }}
                                    >
                                        {customItemComponent({realizedValue})}
                                    </div>
                                );
                            }

                            
                        }

                        return selectableItems;
                    })()}
                </div>
                <Scrollbar length={selectableContentsHeight}
                           itemsDisplayed={optionShowCount}
                           totalItems={values.length}
                           setItemPositionOut={scrollbarSetItemPositionOut}
                           alternativeScrollingElements={SCROLLABLE_ELEMENTS}
                           onScrollbarUpdate={(e) => {
                               setShownStartIndex(e);
                           }}
                />
            </div>
        </div>
    );
};

export default LazySelector;