import { jsx } from "../../static-react/jsx-runtime.js";
import { ReferenceableReact } from "./client-util.js";

export class ImagePreloader {
    #referenceableReact;
    #reactElement;

    /** @type {Map<string, HTMLImageElement} */
    #preloadedImages = new Map();

    constructor() {
        this.#referenceableReact = ReferenceableReact();
        this.#reactElement = this.#referenceableReact.react(<div style={{position: "absolute", zIndex: -1000, opacity:0.01}}></div>);
    }

    reactElement() {
        return this.#reactElement;
    }

    /**
     * @param {string[]} images 
     */
    setPreload(images) {
        const imagesSet = new Set(images);
        for (const [image, element] of this.#preloadedImages) {
            if (!imagesSet.has(image)) {
                this.#referenceableReact.dom.removeChild(element);
                this.#preloadedImages.delete(image);
            }
        }

        for (const image of imagesSet) {
            if (this.#preloadedImages.has(image)) {
                continue;
            }

            const element = document.createElement("img");
            element.src = image;
            element.style.position = "absolute";
            element.style.width = "100vw";
            element.style.height = "100vh";
            this.#referenceableReact.dom.appendChild(element);
            this.#preloadedImages.set(image, element);
        }

    }
}


/**
 * @param {import("react").JSX.Element} jsxElement 
 */
export function asDom(jsxElement) {
    return jsx(
        "dom",
        {children: jsxElement},
    );
}