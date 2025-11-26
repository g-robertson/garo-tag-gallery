import { concatCallback, ReferenceableReact } from "../js/client-util.js";
import { ExistingState } from "../page/pages.js";

const SCROLL_CURSOR_MIN_LENGTH = 20;

/** @import {ExistingStateRef, ExistingStateConstRef} from "../page/pages.js" */

/**
 * @param {{
 *     lengthConstRef: ExistingStateConstRef<number>
 *     itemsDisplayed: number
 *     totalItems: ExistingStateConstRef<number>
 *     scrollbarIntervalConstRef?: number
 *     scrollbarIncrementConstRef?: number
 *     alternativeScrollingElements?: ReturnType<ReferenceableReact>[]
 *     itemPositionRef: ExistingStateRef<number>
 *     scrollbarWidth?: number
 * }} param0 
 */
const Scrollbar = ({
    lengthConstRef,
    itemsDisplayedConstRef,
    totalItemsConstRef,
    scrollbarIntervalConstRef,
    scrollbarIncrementConstRef,
    alternativeScrollingElements,
    itemPositionRef,
    scrollbarWidth
}) => {
    scrollbarWidth ??= 17;
    scrollbarIntervalConstRef ??= ExistingState.stateRef(1);
    scrollbarIncrementConstRef ??= ExistingState.stateRef(4);
    const lastPossibleScrollPositionRef = ExistingState.tupleTransformRef([totalItemsConstRef, itemsDisplayedConstRef, scrollbarIntervalConstRef], () => {
        return Math.max(Math.ceil((totalItemsConstRef.get() - itemsDisplayedConstRef.get()) / scrollbarIntervalConstRef.get()) * scrollbarIntervalConstRef.get(), 0);
    });
    alternativeScrollingElements ??= [];

    const RootElement = ReferenceableReact();
    const ScrollCursor = ReferenceableReact();
    
    /** @type {ExistingStateRef<number | null>} */
    const preClickItemPositionRef = ExistingState.stateRef(null);
    /** @type {ExistingStateRef<number | null>} */
    const clickedCursorPosRef = ExistingState.stateRef(null);
    /** @type {ExistingStateRef<number | null>} */
    const clickedScrollbarPosRef = ExistingState.stateRef(null);

    const scrollCursorLengthRef = ExistingState.tupleTransformRef([lengthConstRef, itemsDisplayedConstRef, totalItemsConstRef], () => {
        if (totalItemsConstRef.get() !== 0) {
            return Math.max(SCROLL_CURSOR_MIN_LENGTH, lengthConstRef.get() * Math.min(1, itemsDisplayedConstRef.get() / totalItemsConstRef.get()));
        }
        return lengthConstRef.get();
    });

    const scrollBarTravelDistanceRef = ExistingState.tupleTransformRef([lengthConstRef, scrollCursorLengthRef], () => {
        return lengthConstRef.get() - scrollCursorLengthRef.get();
    });

    const scrollbarPositionTopRef = ExistingState.tupleTransformRef([itemPositionRef, lastPossibleScrollPositionRef, scrollBarTravelDistanceRef], () => {
        if (lastPossibleScrollPositionRef.get() !== 0) {
            return (itemPositionRef.get() / lastPossibleScrollPositionRef.get()) * scrollBarTravelDistanceRef.get();
        }
        return 0;
    })

    /** @type {(itemPosition: number) => void} */
    const getClampedItemPosition = (itemPosition) => {
        if (itemPosition < 0) {
            itemPosition = 0;
        } else if (itemPosition > lastPossibleScrollPositionRef.get()) {
            itemPosition = lastPossibleScrollPositionRef.get();
        }
        
        if (scrollbarIntervalConstRef.get() === 0) {
            return 0;
        }

        return Math.floor(itemPosition / scrollbarIntervalConstRef.get()) * scrollbarIntervalConstRef.get();
    }
    
    const wheelListener = (e) => {
        let change = 0;
        if (e.deltaY > 0) {
            change = scrollbarIncrementConstRef.get();
        } else if (e.deltaY < 0) {
            change = -scrollbarIncrementConstRef.get();
        }
        const newItemPosition = getClampedItemPosition(itemPositionRef.get() + change);
        itemPositionRef.update(newItemPosition);
    }

    const scrollbarMove = (pos) => {
        if (RootElement.dom === null || pos === null || scrollBarTravelDistanceRef.get() === 0) {
            return;
        }

        const elemTop = window.pageYOffset + RootElement.dom.getBoundingClientRect().top;
        const amountTraversed = (pos - elemTop - (scrollCursorLengthRef.get() / 2)) / scrollBarTravelDistanceRef.get();
        itemPositionRef.update(getClampedItemPosition(Math.floor(amountTraversed * lastPossibleScrollPositionRef.get())));
    }

    const onAdd = () => {
        let cleanup = () => {};

        const onLengthChanged = () => {
            if (RootElement.dom === null) return;

            RootElement.dom.style.height = `${lengthConstRef.get()}px`;
        }
        cleanup = lengthConstRef.addOnUpdateCallback(onLengthChanged, cleanup, {requireChangeForUpdate: true});

        const onScrollCursorLengthChanged = () => {
            if (ScrollCursor.dom === null) return;

            ScrollCursor.dom.style.height = `${scrollCursorLengthRef.get()}px`;
            ScrollCursor.dom.style.lineHeight = `${scrollCursorLengthRef.get()}px`;
        }
        cleanup = scrollCursorLengthRef.addOnUpdateCallback(onScrollCursorLengthChanged, cleanup, {requireChangeForUpdate: true});

        const onScrollbarPositionTopChanged = () => {
            if (ScrollCursor.dom === null) return;
            
            ScrollCursor.dom.style.marginTop = `${scrollbarPositionTopRef.get()}px`;
        }
        // ideally this would requireChangeForUpdate, doesn't work!!!
        cleanup = scrollbarPositionTopRef.addOnUpdateCallback(onScrollbarPositionTopChanged, cleanup, {requireChangeForUpdate: true, debug:true});

        for (const item of alternativeScrollingElements) {
            item.dom.addEventListener("wheel", wheelListener);
        }
        cleanup = concatCallback(cleanup, () => {
            for (const item of alternativeScrollingElements) {
                if (item.dom === null) {
                    continue;
                }
                
                item.dom.removeEventListener("wheel", wheelListener);
            }
        });

        cleanup = clickedScrollbarPosRef.addOnUpdateCallback(scrollbarMove, cleanup);

        const mouseMoveListener = (e) => {
            if (clickedScrollbarPosRef.get() !== null) {
                scrollbarMove(e.clientY);
            }
            if (clickedCursorPosRef.get() === null || scrollBarTravelDistanceRef.get() === 0) {
                return;
            }

            const pixelDelta = e.pageY - clickedCursorPosRef.get();
            const traveledIndices = Math.floor((pixelDelta / scrollBarTravelDistanceRef.get()) * lastPossibleScrollPositionRef.get());
            itemPositionRef.update(getClampedItemPosition(preClickItemPositionRef.get() + traveledIndices));
        };
        window.addEventListener("mousemove", mouseMoveListener);
        cleanup = concatCallback(cleanup, () => window.removeEventListener("mousemove", mouseMoveListener));

        const mouseUpListener = () => {
            clickedScrollbarPosRef.update(null);
            clickedCursorPosRef.update(null);  
        };
        window.addEventListener("mouseup", mouseUpListener);
        cleanup = concatCallback(cleanup, () => window.removeEventListener("mouseup", mouseUpListener));

        return cleanup;
    };

    return scrollbarWidth !== 0
    ? RootElement.react(
        <div className="scrollbar" style={{width: scrollbarWidth}} onAdd={onAdd} onWheel={wheelListener} onMouseDown={(e) => {
            if (!e.target.classList.contains("scrollbar")) {
                return;
            }

            clickedScrollbarPosRef.update(e.clientY);
        }}>
            {ScrollCursor.react(<div className="scroll-cursor"
                 style={{width: "100%"}}
                 onMouseDown={(e) => {
                    preClickItemPositionRef.update(itemPositionRef.get());
                    clickedCursorPosRef.update(e.pageY);
                 }}>&#8801;</div>)}
        </div>
    )
    : <div onAdd={onAdd}></div>
}
export default Scrollbar;