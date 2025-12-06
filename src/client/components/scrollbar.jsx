import { concatCallback, executeFunctions, ReferenceableReact } from "../js/client-util.js";
import { State } from "../page/pages.js";

const SCROLL_CURSOR_MIN_LENGTH = 20;

/** @import {State, ConstState} from "../page/pages.js" */

/**
 * @param {{
 *     lengthConstState: ConstState<number>
 *     itemsDisplayed: number
 *     totalItems: ConstState<number>
 *     scrollbarIntervalConstState?: number
 *     scrollbarIncrementConstState?: number
 *     alternativeScrollingElements?: ReturnType<ReferenceableReact>[]
 *     itemPositionState: State<number>
 *     scrollbarWidth?: number
 * }} param0 
 */
const Scrollbar = ({
    lengthConstState,
    itemsDisplayedConstState,
    totalItemsConstState,
    scrollbarIntervalConstState,
    scrollbarIncrementConstState,
    alternativeScrollingElements,
    itemPositionState,
    scrollbarWidth
}) => {
    /** @type {(() => {})[]} */
    const addToCleanup = [];
    scrollbarWidth ??= 17;
    alternativeScrollingElements ??= [];
    scrollbarIntervalConstState ??= new State(1);
    scrollbarIncrementConstState ??= new State(4);
    /** @type {State<number | null>} */
    const preClickitemPositionState = new State(null);
    /** @type {State<number | null>} */
    const clickedCursorPosRef = new State(null);
    /** @type {State<number | null>} */
    const clickedScrollbarPosRef = new State(null);
    const lastPossibleScrollPositionRef = State.tupleTransform([totalItemsConstState, itemsDisplayedConstState, scrollbarIntervalConstState], () => {
        return Math.max(Math.ceil((totalItemsConstState.get() - itemsDisplayedConstState.get()) / scrollbarIntervalConstState.get()) * scrollbarIntervalConstState.get(), 0);
    }, addToCleanup);

    const RootElement = ReferenceableReact();
    const ScrollCursor = ReferenceableReact();
    

    const scrollCursorLengthRef = State.tupleTransform([lengthConstState, itemsDisplayedConstState, totalItemsConstState], () => {
        if (totalItemsConstState.get() !== 0) {
            return Math.max(SCROLL_CURSOR_MIN_LENGTH, lengthConstState.get() * Math.min(1, itemsDisplayedConstState.get() / totalItemsConstState.get()));
        }
        return lengthConstState.get();
    }, addToCleanup);

    const scrollBarTravelDistanceRef = State.tupleTransform([lengthConstState, scrollCursorLengthRef], () => {
        return lengthConstState.get() - scrollCursorLengthRef.get();
    }, addToCleanup);

    const scrollbarPositionTopRef = State.tupleTransform([itemPositionState, lastPossibleScrollPositionRef, scrollBarTravelDistanceRef], () => {
        if (lastPossibleScrollPositionRef.get() !== 0) {
            return (itemPositionState.get() / lastPossibleScrollPositionRef.get()) * scrollBarTravelDistanceRef.get();
        }
        return 0;
    }, addToCleanup)

    /** @type {(itemPosition: number) => void} */
    const getClampedItemPosition = (itemPosition) => {
        if (itemPosition < 0) {
            itemPosition = 0;
        } else if (itemPosition > lastPossibleScrollPositionRef.get()) {
            itemPosition = lastPossibleScrollPositionRef.get();
        }
        
        if (scrollbarIntervalConstState.get() === 0) {
            return 0;
        }

        return Math.floor(itemPosition / scrollbarIntervalConstState.get()) * scrollbarIntervalConstState.get();
    }
    
    const wheelListener = (e) => {
        let change = 0;
        if (e.deltaY > 0) {
            change = scrollbarIncrementConstState.get();
        } else if (e.deltaY < 0) {
            change = -scrollbarIncrementConstState.get();
        }
        const newItemPosition = getClampedItemPosition(itemPositionState.get() + change);
        itemPositionState.set(newItemPosition);
    }

    const scrollbarMove = (pos) => {
        if (RootElement.dom === null || pos === null || scrollBarTravelDistanceRef.get() === 0) {
            return;
        }

        const elemTop = window.pageYOffset + RootElement.dom.getBoundingClientRect().top;
        const amountTraversed = (pos - elemTop - (scrollCursorLengthRef.get() / 2)) / scrollBarTravelDistanceRef.get();
        itemPositionState.set(getClampedItemPosition(Math.floor(amountTraversed * lastPossibleScrollPositionRef.get())));
    }

    const onAdd = () => {
        const onLengthChanged = () => {
            if (RootElement.dom === null) return;

            RootElement.dom.style.height = `${lengthConstState.get()}px`;
        }
        lengthConstState.addOnUpdateCallback(onLengthChanged, addToCleanup, {requireChangeForUpdate: true});

        const onScrollCursorLengthChanged = () => {
            if (ScrollCursor.dom === null) return;

            ScrollCursor.dom.style.height = `${scrollCursorLengthRef.get()}px`;
            ScrollCursor.dom.style.lineHeight = `${scrollCursorLengthRef.get()}px`;
        }
        scrollCursorLengthRef.addOnUpdateCallback(onScrollCursorLengthChanged, addToCleanup, {requireChangeForUpdate: true});

        const onScrollbarPositionTopChanged = () => {
            if (ScrollCursor.dom === null) return;
            
            ScrollCursor.dom.style.marginTop = `${scrollbarPositionTopRef.get()}px`;
        }
        // ideally this would requireChangeForUpdate, doesn't work!!!
        scrollbarPositionTopRef.addOnUpdateCallback(onScrollbarPositionTopChanged, addToCleanup, {requireChangeForUpdate: true, debug:true});

        for (const item of alternativeScrollingElements) {
            item.dom.addEventListener("wheel", wheelListener);
        }
        addToCleanup.push(() => {
            for (const item of alternativeScrollingElements) {
                if (item.dom === null) {
                    continue;
                }
                
                item.dom.removeEventListener("wheel", wheelListener);
            }
        });

        clickedScrollbarPosRef.addOnUpdateCallback(scrollbarMove, addToCleanup);

        const mouseMoveListener = (e) => {
            if (clickedScrollbarPosRef.get() !== null) {
                scrollbarMove(e.clientY);
            }
            if (clickedCursorPosRef.get() === null || scrollBarTravelDistanceRef.get() === 0) {
                return;
            }

            const pixelDelta = e.pageY - clickedCursorPosRef.get();
            const traveledIndices = Math.floor((pixelDelta / scrollBarTravelDistanceRef.get()) * lastPossibleScrollPositionRef.get());
            itemPositionState.set(getClampedItemPosition(preClickitemPositionState.get() + traveledIndices));
        };
        window.addEventListener("mousemove", mouseMoveListener);
        addToCleanup.push(() => window.removeEventListener("mousemove", mouseMoveListener));

        const mouseUpListener = () => {
            clickedScrollbarPosRef.set(null);
            clickedCursorPosRef.set(null);  
        };
        window.addEventListener("mouseup", mouseUpListener);
        addToCleanup.push(() => window.removeEventListener("mouseup", mouseUpListener));

        return () => executeFunctions(addToCleanup);
    };

    return scrollbarWidth !== 0
    ? RootElement.react(
        <div className="scrollbar" style={{width: scrollbarWidth}} onAdd={onAdd} onWheel={wheelListener} onMouseDown={(e) => {
            if (!e.target.classList.contains("scrollbar")) {
                return;
            }

            clickedScrollbarPosRef.set(e.clientY);
        }}>
            {ScrollCursor.react(<div className="scroll-cursor"
                 style={{width: "100%"}}
                 onMouseDown={(e) => {
                    preClickitemPositionState.set(itemPositionState.get());
                    clickedCursorPosRef.set(e.pageY);
                 }}>&#8801;</div>)}
        </div>
    )
    : <div onAdd={onAdd}></div>
}
export default Scrollbar;