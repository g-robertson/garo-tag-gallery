'use strict';
import React from "react";
import jsxRuntime from "react/jsx-runtime";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

let unusedIDCount = 1;
function unusedID() {
    let id = "__u-";
    let idNumber = ++unusedIDCount;
    while (idNumber > 0) {
        id += ALPHABET[idNumber % ALPHABET.length];
        idNumber = Math.floor(idNumber / ALPHABET.length);
    }

    return id;
}

const PROP_REMAPPING = new Map([
    ["ondoubleclick", "ondblclick"],
    ["for", "htmlFor"],
    ["class", "className"]
]);

const EVENT_PROPS = new Set([
    "abort",
    "animationcancel",
    "animationend",
    "animationiteration",
    "animationstart",
    "auxclick",
    "beforeinput",
    "beforematch",
    "beforetoggle",
    "blur",
    "cancel",
    "canplay",
    "canplaythrough",
    "change",
    "click",
    "close",
    "compositionend",
    "compositionstart",
    "compositionupdate",
    "contextlost",
    "contextmenu",
    "contextrestored",
    "copy",
    "cuechange",
    "cut",
    "dblclick",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "emptied",
    "ended",
    "error",
    "focus",
    "focusin",
    "focusout",
    "formdata",
    "fullscreenchange",
    "fullscreenerror",
    "gotpointercapture",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "lostpointercapture",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "paste",
    "pause",
    "play",
    "playing",
    "pointercancel",
    "pointerdown",
    "pointerenter",
    "pointerleave",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerrawupdate",
    "pointerup",
    "progress",
    "ratechange",
    "reset",
    "resize",
    "scroll",
    "scrollend",
    "securitypolicyviolation",
    "seeked",
    "seeking",
    "select",
    "selectionchange",
    "selectstart",
    "slotchange",
    "stalled",
    "submit",
    "suspend",
    "timeupdate",
    "toggle",
    "touchcancel",
    "touchend",
    "touchmove",
    "touchstart",
    "transitioncancel",
    "transitionend",
    "transitionrun",
    "transitionstart",
    "volumechange",
    "waiting",
    "webkitanimationend",
    "webkitanimationiteration",
    "webkitanimationstart",
    "webkittransitionend",
    "wheel"
]);

const EASY_PROPS = new Set([
    "id",
    "name",
    "value",
    "disabled",
    "title",
    "tabIndex",
    "type",
    "checked",
    "action",
    "target",
    "method",
    "src",
    "controls",
    "enctype",
    "multiple",
    "href",
    "download",
    "selected",
    "for",
    "htmlFor",
    "class",
    "className"
]);

const OnAddEvents = new Map();
const OnRemoveEvents = new Map();
window.addEventListener("load", () => {
    const observationFunction = () => {
        for (const [reactRef, onAdd] of OnAddEvents) {
            if (document.querySelector(`[data-react-ref=${reactRef}]`) !== null) {
                // Remove event before calling as onAdd could mutate document and cause another observation
                OnAddEvents.delete(reactRef);
                const onRemove = onAdd();
                if (typeof onRemove === "function") {
                    OnRemoveEvents.set(reactRef, onRemove);
                }
            }
        }
        for (const [reactRef, onRemove] of OnRemoveEvents) {
            if (document.querySelector(`[data-react-ref=${reactRef}]`) === null) {
                // Remove event before calling as onRemove could mutate document and cause another observation
                OnRemoveEvents.delete(reactRef);
                onRemove();
            }
        }
    }

    const observer = new MutationObserver(observationFunction);
    observer.observe(document.body, {childList: true, subtree: true});
    observationFunction();
})

const stringNumbers = new Set(["flex", "flexGrow", "zIndex"]);

function styleKeyValueMapper(key, value) {
    if (typeof value === "number") {
        if (stringNumbers.has(key)) {
            return value.toString();
        } else {
            return `${value}px`;
        }
    } else {
        return value;
    }
}

function domProcessChildren(type, props) {
    const createdElements = [];

    if (props.children !== undefined) {
        let children = props.children;
        if (!(props.children instanceof Array)) {
            children = [props.children];
        }

        for (const child of children ?? []) {
            if (child === undefined) {
                continue;
            }
            
            if (typeof child === "string" || typeof child === "number" || typeof child === "bigint" || typeof child === "boolean") {
                createdElements.push(document.createTextNode(child));
            } else {
                let childChildren = child;
                if (!(childChildren instanceof Array)) {
                    childChildren = [childChildren];
                }
                
                for (const jsxElement of childChildren) {
                    const createdElement = domCreateElement(jsxElement.type, jsxElement.props);
                    if (createdElement instanceof Array) {
                        createdElements.push(...createdElement);
                    } else {
                        createdElements.push(createdElement);
                    }
                }
            }
        }
    }

    return createdElements;
}

function domCreateElement(type, props) {
    if (type instanceof Array) {
        return type;
    }
    if (type === React.Fragment || type === "dom") {
        return domProcessChildren(type, props);
    }

    const reactRef = props['data-react-ref'];

    if (typeof type === "function") {
        const evaluatedElement = type(props);
        if (evaluatedElement instanceof Array) {
            return evaluatedElement;
        } else {
            return domCreateElement(evaluatedElement.type, evaluatedElement.props);
        }
    }

    const element = document.createElement(type);
    for (let prop in props) {
        const value = props[prop];
        prop = PROP_REMAPPING.get(prop.toLowerCase()) ?? prop;
        
        if (EASY_PROPS.has(prop)) {
            element[prop] = value;
            continue;
        } else if (prop.startsWith("data-")) {
            element.setAttribute(prop, value);
            continue;
        }

        const eventProp = prop.toLowerCase();
        const eventName = eventProp.slice(2);
        if (eventProp.startsWith("on") && EVENT_PROPS.has(eventName)) {
            element.addEventListener(eventName, value);
        }
    }

    if (props.style !== undefined) {
        for (const styleProp in props.style) {
            element.style[styleProp] = styleKeyValueMapper(styleProp, props.style[styleProp]);
        }
    }

    for (const child of domProcessChildren(type, props)) {
        element.appendChild(child);
    }

    if (props.onAdd !== undefined) {
        OnAddEvents.set(reactRef, props.onAdd);
    }

    return element;
}

export const Fragment = jsxRuntime.Fragment;
export const jsx = (type, props, key) => {
    props['data-react-ref'] = unusedID();
    // I don't care about key because I'm not really using react for this
    key ??= unusedID();
    if (type === "dom" || props.dom === true) {
        return domCreateElement(type, props, key);
    } else {
        return jsxRuntime.jsx(type, props, key);
    }
}
export const jsxDEV = jsx;
export const jsxs = (type, props, key) => {
    props['data-react-ref'] = unusedID();
    // I don't care about key because I'm not really using react for this
    key ??= unusedID();
    if (type === "dom" || props.dom === true) {
        return domCreateElement(type, props, key);
    } else {
        return jsxRuntime.jsxs(type, props, key);
    }
}