
/**
 * @typedef {Object} PageType
 * @property {string} pageType
 * @property {string} pageDisplayName
 * @property {string} pageID
 * @property {any} persistentState
*/

import setUserPages from "../../api/client-get/set-user-pages.js";
import { clamp, unusedID } from "../js/client-util.js";
import { asDom } from "../js/client-exclusive-util.js";
import { PersistentState } from "../js/state.js";
import DuplicatesProcessingPage, { DUPLICATES_PROCESSING_PAGE_NAME } from "./pages/duplicates-page.jsx";
import FileSearchPageElement, { FILE_SEARCH_PAGE_NAME } from "./pages/file-search-page.jsx";

export class Page {
    #pageType;
    #pageDisplayName;
    #pageID;
    #persistentState;
    /** @type {Element} */
    #dom;

    /**
     * @param {string} pageType 
     * @param {string} pageDisplayName 
     * @param {PersistentState=} persistentState
     * @param {string=} pageID
     */
    constructor(pageType, pageDisplayName, persistentState, pageID) {
        this.#pageType = pageType;
        this.#pageDisplayName = pageDisplayName;
        this.#persistentState = persistentState ?? new PersistentState();
        // no cleanup needed, page will already be destroyed if this needs cleaned up
        this.#persistentState.addOnUpdateCallback(() => {
            setUserPages(Pages.Global());
        }, null);
        this.#pageID = pageID ?? unusedID();
    }

    /**
     * @param {PageType} pageJSON
     */
    static fromJSON(pageJSON) {
        return new Page(
            pageJSON.pageType,
            pageJSON.pageDisplayName,
            new PersistentState(pageJSON.persistentState),
            pageJSON.pageID
        );
    }

    toJSON() {
        return {
            pageType: this.#pageType,
            pageDisplayName: this.#pageDisplayName,
            persistentState: this.#persistentState.toJSON(),
            pageID: this.#pageID
        };
    }

    get dom() {
        if (this.pageType === FILE_SEARCH_PAGE_NAME) {
            this.#dom = asDom(FileSearchPageElement({page: this}));
        } else if (this.pageType === DUPLICATES_PROCESSING_PAGE_NAME) {
            this.#dom = asDom(DuplicatesProcessingPage({page: this}));
        }

        return this.#dom;
    }

    get pageType() {
        return this.#pageType;
    }

    get pageDisplayName() {
        return this.#pageDisplayName;
    }

    get pageID() {
        return this.#pageID;
    }

    get persistentState() {
        return this.#persistentState;
    }
}

export class Pages {
    /** @type {Page[]} */
    #pages = [];
    /** @type {Page} */
    #currentPage = undefined;
    /** @type {Set<() => void>} */
    #onUpdateCallbacks = new Set();
    /** @type {Set<() => void>} */
    #onCurrentPageChangedCallbacks = new Set();

    /**
     * @param {Page[]=} pages 
     */
    constructor(pages) {
        pages ??= [];
        this.#pages = pages;
    }

    toJSON() {
        return this.#pages.map(page => page.toJSON());
    }

    static #Gl_Pages = new Pages();

    static Global() {
        return Pages.#Gl_Pages;
    }

    /**
     * @param {Pages} newPages 
     */
    static makeGlobal(newPages) {
        newPages.#onUpdateCallbacks = Pages.#Gl_Pages.#onUpdateCallbacks;
        newPages.#onCurrentPageChangedCallbacks = Pages.#Gl_Pages.#onCurrentPageChangedCallbacks;
        Pages.#Gl_Pages.#onUpdateCallbacks = new Set();
        Pages.#Gl_Pages.#onCurrentPageChangedCallbacks = new Set();
        Pages.#Gl_Pages = newPages;
        Pages.#Gl_Pages.#onUpdate();
        Pages.#Gl_Pages.#onCurrentPageChanged();
    }

    get pages() {
        return this.#pages;
    }
    get currentPage() {
        return this.#currentPage;
    }

    #onUpdate() {
        for (const onUpdateCallback of this.#onUpdateCallbacks) {
            onUpdateCallback();
        }
    }

    /**
     * @param {() => void} onUpdateCallback
     * @param {(() => void)[]} addToCleanup
     */
    addOnUpdateCallback(onUpdateCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback for pages";
        }

        this.#onUpdateCallbacks.add(onUpdateCallback);

        addToCleanup.push(() => {
            this.#onUpdateCallbacks.delete(onUpdateCallback);
        });
    }
    
    #onCurrentPageChanged() {
        for (const onCurrentPageChangedCallback of this.#onCurrentPageChangedCallbacks) {
            onCurrentPageChangedCallback();
        }
    }

    /**
     * @param {() => void} onCurrentPageChangedCallback
     * @param {(() => void)[]} addToCleanup
     */
    addOnCurrentPageChangedCallback(onCurrentPageChangedCallback, addToCleanup) {
        if (addToCleanup === undefined) {
            throw "You must specify a cleanup function array for adding a callback for pages";
        }

        this.#onCurrentPageChangedCallbacks.add(onCurrentPageChangedCallback);

        addToCleanup.push(() => {
            this.#onCurrentPageChangedCallbacks.delete(onCurrentPageChangedCallback);
        });
    }

    /**
     * @param {Page[]} pages 
     */
    setPages(pages) {
        this.#pages = pages;
        this.#onUpdate();
    }

    /**
     * @param {Page} page 
     */
    addPage(page) {
        this.#pages.push(page);
        this.#currentPage = page;
        this.#onUpdate();
        this.#onCurrentPageChanged();
    }

    /**
     * @param {Page} page
     */
    setCurrentPage(page) {
        if (this.#currentPage === page) {
            return;
        }

        this.#currentPage = page;
        this.#onUpdate();
        this.#onCurrentPageChanged();
    }

    /**
     * @param {number} index
     */
    removePageAt(index) {
        const removedPage = this.#pages[index];
        this.#pages.splice(index, 1);
        if (removedPage === this.#currentPage) {
            let newIndex = clamp(index - 1, 0, Infinity);
            this.#currentPage = this.#pages[newIndex];
            this.#onCurrentPageChanged();
        }
        this.#onUpdate();
    }
    
    /**
     * @param {Page} page 
     */
    removePage(page) {
        const pageIndex = this.#pages.findIndex(pagesPage => pagesPage === page);
        this.removePageAt(pageIndex);
    }
};