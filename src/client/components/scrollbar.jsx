import { executeFunctions, ReferenceableReact } from "../js/client-util.js";
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
    const clickedCursorPosState = new State(null);
    /** @type {State<number | null>} */
    const clickedScrollbarPosState = new State(null);
    const lastPossibleScrollPositionState = State.tupleTransform([totalItemsConstState, itemsDisplayedConstState, scrollbarIntervalConstState], () => {
        return Math.max(Math.ceil((totalItemsConstState.get() - itemsDisplayedConstState.get()) / scrollbarIntervalConstState.get()) * scrollbarIntervalConstState.get(), 0);
    }, addToCleanup);

    const RootElement = ReferenceableReact();
    const ScrollCursor = ReferenceableReact();
    

    const scrollCursorLengthState = State.tupleTransform([lengthConstState, itemsDisplayedConstState, totalItemsConstState], () => {
        if (totalItemsConstState.get() !== 0) {
            return Math.max(SCROLL_CURSOR_MIN_LENGTH, lengthConstState.get() * Math.min(1, itemsDisplayedConstState.get() / totalItemsConstState.get()));
        }
        return lengthConstState.get();
    }, addToCleanup);

    const scrollBarTravelDistanceState = State.tupleTransform([lengthConstState, scrollCursorLengthState], () => {
        return lengthConstState.get() - scrollCursorLengthState.get();
    }, addToCleanup);

    const scrollbarPositionTopState = State.tupleTransform([itemPositionState, lastPossibleScrollPositionState, scrollBarTravelDistanceState], () => {
        if (lastPossibleScrollPositionState.get() !== 0) {
            return (itemPositionState.get() / lastPossibleScrollPositionState.get()) * scrollBarTravelDistanceState.get();
        }
        return 0;
    }, addToCleanup)

    /** @type {(itemPosition: number) => void} */
    const getClampedItemPosition = (itemPosition) => {
        if (itemPosition < 0) {
            itemPosition = 0;
        } else if (itemPosition > lastPossibleScrollPositionState.get()) {
            itemPosition = lastPossibleScrollPositionState.get();
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
        if (RootElement.dom === null || pos === null || scrollBarTravelDistanceState.get() === 0) {
            return;
        }

        const elemTop = window.pageYOffset + RootElement.dom.getBoundingClientRect().top;
        const amountTraversed = (pos - elemTop - (scrollCursorLengthState.get() / 2)) / scrollBarTravelDistanceState.get();
        itemPositionState.set(getClampedItemPosition(Math.floor(amountTraversed * lastPossibleScrollPositionState.get())));
    }

    const onAdd = () => {
        const onLengthChanged = () => {
            if (RootElement.dom === null) return;

            RootElement.dom.style.height = `${lengthConstState.get()}px`;
        }
        lengthConstState.addOnUpdateCallback(onLengthChanged, addToCleanup, {requireChangeForUpdate: true});

        const onScrollCursorLengthChanged = () => {
            if (ScrollCursor.dom === null) return;

            ScrollCursor.dom.style.height = `${scrollCursorLengthState.get()}px`;
            ScrollCursor.dom.style.lineHeight = `${scrollCursorLengthState.get()}px`;
        }
        scrollCursorLengthState.addOnUpdateCallback(onScrollCursorLengthChanged, addToCleanup, {requireChangeForUpdate: true});

        const onScrollbarPositionTopChanged = () => {
            if (ScrollCursor.dom === null) return;
            
            ScrollCursor.dom.style.marginTop = `${scrollbarPositionTopState.get()}px`;
        }
        // ideally this would requireChangeForUpdate, doesn't work!!!
        scrollbarPositionTopState.addOnUpdateCallback(onScrollbarPositionTopChanged, addToCleanup, {requireChangeForUpdate: true, debug:true});

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

        clickedScrollbarPosState.addOnUpdateCallback(scrollbarMove, addToCleanup);

        const mouseMoveListener = (e) => {
            if (clickedScrollbarPosState.get() !== null) {
                scrollbarMove(e.clientY);
            }
            if (clickedCursorPosState.get() === null || scrollBarTravelDistanceState.get() === 0) {
                return;
            }

            const pixelDelta = e.pageY - clickedCursorPosState.get();
            const traveledIndices = Math.floor((pixelDelta / scrollBarTravelDistanceState.get()) * lastPossibleScrollPositionState.get());
            itemPositionState.set(getClampedItemPosition(preClickitemPositionState.get() + traveledIndices));
        };
        window.addEventListener("mousemove", mouseMoveListener);
        addToCleanup.push(() => window.removeEventListener("mousemove", mouseMoveListener));

        const mouseUpListener = () => {
            clickedScrollbarPosState.set(null);
            clickedCursorPosState.set(null);  
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

            clickedScrollbarPosState.set(e.clientY);
        }}>
            {ScrollCursor.react(<div className="scroll-cursor"
                 style={{width: "100%"}}
                 onMouseDown={(e) => {
                    preClickitemPositionState.set(itemPositionState.get());
                    clickedCursorPosState.set(e.pageY);
                 }}>&#8801;</div>)}
        </div>
    )
    : <div onAdd={onAdd}></div>
}
export default Scrollbar;