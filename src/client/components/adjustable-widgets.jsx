import '../global.css';

import { clamp, executeFunctions, ReferenceableReact } from '../js/client-util.js';
import { PersistentState, State } from '../js/state.js';

/** @import {JSX} from "react" */

/**
 * @typedef {Object} Widget
 * @property {JSX.Element} element
 * @property {number} defaultFlex
 * @property {number} minFlex
 * @property {number=} maxFlex
 **/

/** @type {Widget} */
export const EXPANSION_AREA = {
    element: <div></div>,
    defaultFlex: 1e-7,
    minFlex: 1e-7,
    maxFlex: 1e-7
};

/** @type {Widget} */
export const EXPANDABLE_EXPANSION_AREA = {
    element: <div></div>,
    defaultFlex: 1e-7,
    minFlex: 1e-7
};

const DRAGBAR_PADDING_SIZE = 6;

/**
 * @param {{
 *  widgets: Widget[]
 *  flexDirection?: "row" | "column"
 *  defaultAfterFlex?: number
 *  persistentState?: PersistentState
 * }} param0
 */
const AdjustableWidgets = ({
    widgets,
    flexDirection,
    defaultAfterFlex,
    persistentState
}) => {
    flexDirection ??= "row";
    defaultAfterFlex ??= 0;
    persistentState ??= new PersistentState();
    // normalize flex to be out of 1
    {
        let totalFlex = defaultAfterFlex;
        for (const widget of widgets) {
            widget.maxFlex ??= Infinity;
            totalFlex += widget.defaultFlex;
        }

        defaultAfterFlex /= totalFlex;
        for (const widget of widgets) {
            widget.defaultFlex /= totalFlex;
            widget.minFlex /= totalFlex;
            widget.maxFlex /= totalFlex;
        }
    }

    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const Widgets = widgets.map(_ => ReferenceableReact());
    /** @type {State<number>[]} */
    const widgetsFlexStates = [];
    const AfterFlex = ReferenceableReact();

    const afterFlexState = persistentState.registerState("after-flex", new State(defaultAfterFlex), {addToCleanup, isSaved: true, name: "After flex"});
    for (let i = 0; i < widgets.length; ++i) {
        widgetsFlexStates[i] = persistentState.registerState(`widget-${i}-flex`, new State(widgets[i].defaultFlex), {addToCleanup, isSaved: true, name: `Widget ${i}`});
    }


    /** @type {number | null} */
    let clickedDragBarPos = null;
    /** @type {number | null} */
    let clickedDragBarIndex = null;
    /** @type {number | null} */
    let preClickActiveWidgetFlex = null;
    /** @type {number | null} */
    let preClickActiveWidgetSize = null;
    /** @type {number | null} */
    let preClickActiveWidgetShrinkArea = null;
    /** @type {number | null} */
    let preClickActiveWidgetGrowthArea = null;

    /**
     * @param {number} i 
     */
    const ithWidgetIsResizable = (i) => {
        return i !== widgets.length - 1 && widgets[i].defaultFlex !== 0 && widgets[i + 1].defaultFlex !== 0;
    };

    const onAdd = () => {
        /**
         * @param {MouseEvent} e 
         */
        const mouseMoveListener = (e) => {
            if (clickedDragBarIndex === null) {
                return;
            }

            // how much total area is available for distribution
            let totalFlexableArea = flexDirection === "row" ? AfterFlex.dom.getBoundingClientRect().width : AfterFlex.dom.getBoundingClientRect().height;
            for (let i = 0; i < Widgets.length; ++i) {
                if (widgets[i].defaultFlex !== 0) {
                    totalFlexableArea += flexDirection === "row" ? Widgets[i].dom.getBoundingClientRect().width : Widgets[i].dom.getBoundingClientRect().height;
                }
            }

            const activeWidgetMaximumSize = preClickActiveWidgetSize + preClickActiveWidgetGrowthArea;
            const activeWidgetMinFlex = widgets[clickedDragBarIndex].minFlex;
            const activeWidgetMaxFlex = Math.min(widgets[clickedDragBarIndex].maxFlex, activeWidgetMaximumSize / totalFlexableArea);

            // modifiableDistance is however many px the element in front of this one has left + the amount left in the AfterFlex

            const pixelDelta = (flexDirection === "row" ? e.pageX : e.pageY) - clickedDragBarPos;
            const pixelIntoArea = pixelDelta + preClickActiveWidgetShrinkArea;
            const percentIntoArea = clamp(pixelIntoArea / (preClickActiveWidgetShrinkArea + preClickActiveWidgetGrowthArea), 0, 1);
            const newFlex = (percentIntoArea * (activeWidgetMaxFlex - activeWidgetMinFlex)) + activeWidgetMinFlex;
            let flexToRedistribute = newFlex - widgetsFlexStates[clickedDragBarIndex].get();
            if (flexToRedistribute > 0) {
                // first try pushing into AfterFlex
                const flexAvailableInAfterFlex = afterFlexState.get();
                const flexUsedOnAfterFlex = Math.min(flexAvailableInAfterFlex, flexToRedistribute);
                afterFlexState.set(flexAvailableInAfterFlex - flexUsedOnAfterFlex);
                flexToRedistribute -= flexUsedOnAfterFlex;

                // then to neighbors
                for (let i = clickedDragBarIndex + 1; i < widgets.length; ++i) {
                    if (widgets[i].defaultFlex === 0) {
                        continue;
                    }
                    const flexAvailableInNeighbor = widgetsFlexStates[i].get() - widgets[i].minFlex;
                    const flexUsedOnNeighbor = Math.min(flexAvailableInNeighbor, flexToRedistribute);
                    widgetsFlexStates[i].set(widgetsFlexStates[i].get() - flexUsedOnNeighbor);
                    flexToRedistribute -= flexUsedOnNeighbor;
                }

                widgetsFlexStates[clickedDragBarIndex].set(newFlex);
            } else if (flexToRedistribute < 0) {
                // first try pushing into neighbors
                for (let i = clickedDragBarIndex + 1; i < widgets.length; ++i) {
                    if (widgets[i].defaultFlex === 0) {
                        continue;
                    }
                    const flexAvailableInNeighbor = widgetsFlexStates[i].get() - widgets[i].maxFlex;
                    const flexUsedOnNeighbor = Math.max(flexAvailableInNeighbor, flexToRedistribute);
                    widgetsFlexStates[i].set(widgetsFlexStates[i].get() - flexUsedOnNeighbor);
                    flexToRedistribute -= flexUsedOnNeighbor;
                }


                // then to AfterFlex
                afterFlexState.set(afterFlexState.get() - flexToRedistribute); 
                widgetsFlexStates[clickedDragBarIndex].set(newFlex);
            }
            
            window.dispatchEvent(new Event('resize'));
        };
        window.addEventListener("mousemove", mouseMoveListener);
        addToCleanup.push(() => window.removeEventListener("mousemove", mouseMoveListener));

        const mouseUpListener = () => {
            clickedDragBarPos = null;
            clickedDragBarIndex = null;
            preClickActiveWidgetFlex = null;
            preClickActiveWidgetSize = null;
            preClickActiveWidgetShrinkArea = null;
            preClickActiveWidgetGrowthArea = null;
        };
        window.addEventListener("mouseup", mouseUpListener);
        addToCleanup.push(() => window.removeEventListener("mouseup", mouseUpListener));

        for (let i = 0; i < widgetsFlexStates.length; ++i) {
            widgetsFlexStates[i].addOnUpdateCallback((flex) => {
                Widgets[i].dom.style.flexGrow = flex;
            }, addToCleanup);
        }

        afterFlexState.addOnUpdateCallback((flex) => {
            AfterFlex.dom.style.flexGrow = flex;
        }, addToCleanup)

        return () => executeFunctions(addToCleanup);
    };

    /**
     * @param {MouseEvent} e 
     * @param {number} i 
     */
    const onResizeBarMouseDown = (e, i) => {
        clickedDragBarPos = flexDirection === "row" ? e.pageX : e.pageY;
        clickedDragBarIndex = i;
        preClickActiveWidgetFlex = widgetsFlexStates[i].get();
        preClickActiveWidgetSize = flexDirection === "row" ? Widgets[i].dom.getBoundingClientRect().width : Widgets[i].dom.getBoundingClientRect().height;
        const activeWidgetMinimumSize = preClickActiveWidgetSize * (widgets[i].minFlex / preClickActiveWidgetFlex);
        // how many pixels the widget can shrink from pre-click size
        preClickActiveWidgetShrinkArea = preClickActiveWidgetSize - activeWidgetMinimumSize;
        // how many pixels the widget can grow from pre-click size
        preClickActiveWidgetGrowthArea = flexDirection === "row" ? AfterFlex.dom.getBoundingClientRect().width : AfterFlex.dom.getBoundingClientRect().height;
        for (let j = i + 1; j < widgets.length; ++j) {
            if (widgets[j].defaultFlex === 0) {
                continue;
            }
            const neighborWidgetSize = flexDirection === "row" ? Widgets[j].dom.getBoundingClientRect().width : Widgets[j].dom.getBoundingClientRect().height;
            const neighborWidgetFlex = widgetsFlexStates[j].get();
            const neighborWidgetMinimumSize = neighborWidgetSize * (widgets[j].minFlex / neighborWidgetFlex);
            preClickActiveWidgetGrowthArea += neighborWidgetSize - neighborWidgetMinimumSize;
        }
    }

    return (
        <div onAdd={onAdd} style={{width: "100%", height: "100%", flexDirection: flexDirection}}>
            {widgets.map((widget, i) => (<>
                {Widgets[i].react(<div style={{flex: widgetsFlexStates[i].get()}}>
                    {widget.element}
                </div>)}
                {ithWidgetIsResizable(i) ? (
                    <div style={{
                        width: flexDirection === "row" ? "auto" : "100%",
                        flexDirection: flexDirection,
                        cursor: flexDirection === "row" ? "col-resize" : "row-resize"
                    }} onMouseDown={(e) => {
                        onResizeBarMouseDown(e, i);
                    }}>
                        <div style={{padding: flexDirection === "row" ? `0 0 0 ${DRAGBAR_PADDING_SIZE}px` : `${DRAGBAR_PADDING_SIZE}px 0 0 0`}}></div>
                        <div style={{
                            padding: flexDirection === "row" ? `0 ${DRAGBAR_PADDING_SIZE}px 0 0` : `0 0 ${DRAGBAR_PADDING_SIZE}px 0`,
                            border: "0 dashed white",
                            borderWidth: flexDirection === "row" ? "0 1px 0 0" : "1px 0 0 0"
                        }}
                        ></div>
                    </div>
                ) : <></>}
            </>))}
            {AfterFlex.react(<div style={{flex: afterFlexState.get()}}></div>)}
        </div>
    );
};

export default AdjustableWidgets;