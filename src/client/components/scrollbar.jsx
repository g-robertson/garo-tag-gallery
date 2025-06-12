import { useEffect, useRef, useState } from "react";
import { randomID } from "../js/client-util.js";

const SCROLL_CURSOR_MIN_LENGTH = 20;

/**
 * @param {{
 *     length: number
 *     itemsDisplayed: number
 *     totalItems: number
 *     scrollbarInterval?: number
 *     scrollbarIncrement?: number
 *     lastPossibleItem?: number
 *     alternativeScrollingElements?: string[]
 *     onScrollbarUpdate?: (scrollbarPosition: number) => void
 *     setItemPositionOut?: {out: (itemPosition: number) => void | null}
 * }} param0 
 */
const Scrollbar = ({
    length,
    itemsDisplayed,
    totalItems,
    lastPossibleItem,
    scrollbarInterval,
    scrollbarIncrement,
    alternativeScrollingElements,
    onScrollbarUpdate,
    setItemPositionOut
}) => {
    scrollbarInterval ??= 1;
    const scrollbarIntervalRef = useRef(scrollbarInterval);
    scrollbarIntervalRef.current = scrollbarInterval;
    scrollbarIncrement ??= 4;
    lastPossibleItem ??= Math.max(Math.ceil((totalItems - itemsDisplayed) / scrollbarIntervalRef.current) * scrollbarIntervalRef.current, 0);
    alternativeScrollingElements ??= [];
    onScrollbarUpdate ??= () => {};
    setItemPositionOut ??= {};
    const uniqueID = useRef(randomID(32));
    const lastPossibleItemRef = useRef(lastPossibleItem);
    lastPossibleItemRef.current = lastPossibleItem;

    const scrollbarIncrementRef = useRef(scrollbarIncrement);
    scrollbarIncrementRef.current = scrollbarIncrement;
    
    const [itemPosition, setItemPosition] = useState(0);
    /** @type {[number | null, (preClickItemPosition: number | null) => void]} */
    const [preClickItemPosition, setPreClickItemPosition] = useState(null);
    /** @type {[number | null, (clickedCursorPos: number | null) => void]} */
    const [clickedCursorPos, setClickedCursorPos] = useState(null);
    /** @type {[number | null, (clickedScrollbarPos: number | null) => void]} */
    const [clickedScrollbarPos, setClickedScrollbarPos] = useState(null);

    const setItemPositionWithCallback = useRef(() => {});
    setItemPositionWithCallback.current = (itemPosition_) => {
        if (itemPosition !== itemPosition_) {
            setItemPosition(itemPosition_);
            onScrollbarUpdate(itemPosition_);
        }
    }
    setItemPositionOut.out = setItemPositionWithCallback.current;

    let scrollCursorLength = length;
    if (totalItems !== 0) {
        scrollCursorLength = Math.max(SCROLL_CURSOR_MIN_LENGTH, length * Math.min(1, itemsDisplayed / totalItems));
    }

    const scrollBarTravelDistance = length - scrollCursorLength;

    let scrollbarPositionTop = 0;
    if (lastPossibleItemRef.current !== 0) {
        scrollbarPositionTop = (itemPosition / lastPossibleItemRef.current) * scrollBarTravelDistance;;
    } 
    
    /** @type {(itemPosition: number) => void} */
    const getClampedItemPosition = (itemPosition) => {
        if (itemPosition < 0) {
            itemPosition = 0;
        } else if (itemPosition > lastPossibleItemRef.current) {
            itemPosition = lastPossibleItemRef.current;
        }
        
        if (scrollbarIntervalRef.current === 0) {
            return 0;
        }

        return Math.floor(itemPosition / scrollbarIntervalRef.current) * scrollbarIntervalRef.current;
    }

    const wheelListener = (e) => {
        let change = 0;
        if (e.deltaY > 0) {
            change = scrollbarIncrementRef.current;
        } else if (e.deltaY < 0) {
            change = -scrollbarIncrementRef.current;
        }
        const newItemPosition = getClampedItemPosition(itemPosition + change);
        setItemPositionWithCallback.current(newItemPosition);
    }

    useEffect(() => {
        for (const item of alternativeScrollingElements) {
            document.getElementById(item).addEventListener("wheel", wheelListener);
        }

        return () => {
            for (const item of alternativeScrollingElements) {
                const elem = document.getElementById(item);
                if (elem !== null) {
                    elem.removeEventListener("wheel", wheelListener);
                }
            }
        }
    }, [itemPosition]);

    useEffect(() => {
        if (clickedScrollbarPos !== null) {
            const scrollbarElem = document.getElementById(`scrollbar-${uniqueID.current}`);
            const scrollbarMove = (pos) => {
                if (scrollBarTravelDistance === 0) {
                    return;
                }

                const elemTop = window.pageYOffset + scrollbarElem.getBoundingClientRect().top;
                const amountTraversed = (pos - elemTop - (scrollCursorLength / 2)) / scrollBarTravelDistance;
                setItemPositionWithCallback.current(getClampedItemPosition(Math.floor(amountTraversed * lastPossibleItemRef.current)));
            }

            const mouseMoveListener = (e) => {
                scrollbarMove(e.clientY);
            };
            window.addEventListener("mousemove", mouseMoveListener);
            const mouseUpListener = () => {
                setClickedScrollbarPos(null);
            };
            window.addEventListener("mouseup", mouseUpListener);
            scrollbarMove(clickedScrollbarPos);

            return () => {
                window.removeEventListener("mousemove", mouseMoveListener);
                window.removeEventListener("mouseup", mouseUpListener);
            }
        }
    }, clickedScrollbarPos);

    useEffect(() => {
        if (clickedCursorPos !== null) {
            const mouseMoveListener = (e) => {
                if (scrollBarTravelDistance === 0) {
                    return;
                }
                const pixelDelta = e.pageY - clickedCursorPos;
                const traveledIndices = Math.floor((pixelDelta / scrollBarTravelDistance) * lastPossibleItemRef.current);
                setItemPositionWithCallback.current(getClampedItemPosition(preClickItemPosition + traveledIndices));
            };
            window.addEventListener("mousemove", mouseMoveListener);
            const mouseUpListener = () => {
                setClickedCursorPos(null);  
            };
            window.addEventListener("mouseup", mouseUpListener);

            return () => {
                window.removeEventListener("mousemove", mouseMoveListener);
                window.removeEventListener("mouseup", mouseUpListener);
            }
        }
    }, [clickedCursorPos]);

    return (
        <div id={`scrollbar-${uniqueID.current}`} className="scrollbar" style={{width: "17px", height: length, float: "left"}} onWheel={wheelListener} onMouseDown={(e) => {
            if (!e.target.classList.contains("scrollbar")) {
                return;
            }

            setClickedScrollbarPos(e.clientY);
        }}>
            <div className="scroll-cursor"
                 style={{width: "100%", height: scrollCursorLength, lineHeight: `${scrollCursorLength}px`, marginTop: scrollbarPositionTop}}
                 onMouseDown={(e) => {
                    setPreClickItemPosition(itemPosition);
                    setClickedCursorPos(e.pageY);
                 }}>&#8801;</div>
        </div>
    );
}
export default Scrollbar;