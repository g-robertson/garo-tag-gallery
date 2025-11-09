import { z } from "zod";
import { mapNullCoalesce, randomID, T_MINUTE } from "../client/js/client-util.js";

/** @import {Databases} from "./db-util.js" */

/**
 * @template {string} T
 * @template V
 **/
export class Cursor {
    #id;
    #cursorType;
    #cursorValue;
    #cursorTimeout;
    #cursorTimeoutHandle;
    /** @type {((cursor: Cursor) => void)[]} */
    #onTimeoutCallbacks = [];

    #timedOut = false;

    /**
     * @param {{
     *     cursorType: T
     *     cursorValue: V
     *     cursorTimeout?: number
     * }} param0
     */
    constructor({
        cursorType,
        cursorValue,
        cursorTimeout
    }) {
        cursorTimeout ??= 10 * T_MINUTE;
        this.#id = randomID(32);
        this.#cursorType = cursorType;
        this.#cursorValue = cursorValue;
        this.#cursorTimeout = cursorTimeout;
    }

    id() {
        return this.#id;
    }

    #onTimeout() {
        if (this.#timedOut) {
            return;
        }

        this.#timedOut = true;
        clearTimeout(this.#cursorTimeoutHandle);
        for (const callback of this.#onTimeoutCallbacks) {
            callback(this);
        }
    }

    start() {
        this.#cursorTimeoutHandle = setTimeout(this.#onTimeout.bind(this), this.#cursorTimeout);
    }

    /**
     * @returns {T}
     */
    get type() {
        return this.#cursorType;
    }

    /**
     * @returns {V}
     */
    get value() {
        return this.#cursorValue;
    }

    /**
     * @param {V} value 
     */
    setValue(value) {
        this.#cursorValue = value;
    }

    refreshTime() {
        clearTimeout(this.#cursorTimeoutHandle);
        this.#cursorTimeoutHandle = setTimeout(this.#onTimeout.bind(this), this.#cursorTimeout);
    }

    cancel() {
        clearTimeout(this.#cursorTimeoutHandle);
        this.#onTimeout();
    }

    /**
     * @param {(cursor: Cursor) => void} onTimeout
     */
    addOnTimeoutCallback(onTimeout) {
        this.#onTimeoutCallbacks.push(onTimeout);
    }
}

/** @import {DBFileCursor, DBTaggableCursor} from "../api/post/search-taggables.js" */
/** @typedef {DBFileCursor | DBTaggableCursor} UsedCursor */

export class CursorManager {
    /** @type {Map<number, Map<string, UsedCursor>>} */
    #usersCursors = new Map();

    /**
     * @param {number} userID
     * @param {UsedCursor} cursor
     */
    addCursorToUser(userID, cursor) {
        const userCursors = mapNullCoalesce(this.#usersCursors, userID, new Map());

        cursor.addOnTimeoutCallback(cursor => {
            userCursors.delete(cursor.id());
        });

        userCursors.set(cursor.id(), cursor);
        cursor.start();
    }

    /**
     * @param {number} userID
     * @param {string} id
     */
    cancelCursorOnUser(userID, id) {
        const userCursors = this.#usersCursors.get(userID);
        if (userCursors === undefined) {
            return;
        }

        const cursor = userCursors.get(id);
        cursor.cancel();
    }

    /**
     * @param {number} userID
     * @param {string} id
     */
    getCursorForUser(userID, id) {
        const userCursors = this.#usersCursors.get(userID);
        if (userCursors === undefined) {
            return;
        }

        const cursor = userCursors.get(id);
        if (cursor === undefined) {
            return;
        }

        cursor.refreshTime();
        return cursor;
    }
}

/**
 * @param {UsedCursor} cursor
 */
export function getCursorAsTaggableIDs(cursor) {
    if (cursor === undefined) return undefined;

    if (cursor.type === "Taggable") {
        return cursor.value.map(taggable => taggable.Taggable_ID);
    } else if (cursor.type === "File") {
        return cursor.value.flatMap(file => file.Taggable_ID);
    } else {
        return undefined;
    }
}

/**
 * @param {UsedCursor} cursor
 */
export function getCursorAsFileIDs(cursor) {
    if (cursor === undefined) return undefined;

    if (cursor.type === "File") {
        return cursor.value.map(file => file.File_ID);
    } else {
        return undefined;
    }
}

export const Z_WANTED_TAGGABLE_FIELD = z.literal("Taggable_ID");
/** @typedef {z.infer<typeof Z_WANTED_TAGGABLE_FIELD>} WantedTaggableField */

/**
 * @param {UsedCursor} cursor
 * @param {WantedTaggableField | WantedTaggableField[]} wantedFields 
 */
export function getCursorAsTaggableWantedFields(cursor, wantedFields) {
    if (cursor === undefined) return undefined;

    if (cursor.type === "Taggable") {
        if (wantedFields instanceof Array)  {
            return cursor.value.map(taggable => wantedFields.map(field => taggable[field]))
        } else {
            return cursor.value.map(taggable => taggable[wantedFields]);
        }
    } else {
        return undefined;
    }
}

export const Z_WANTED_FILE_FIELD = z.literal("File_ID")
.or(z.literal("File_Hash"))
.or(z.literal("File_Extension"))
.or(z.literal("Perceptual_Hash_Version"));
/** @typedef {z.infer<typeof Z_WANTED_FILE_FIELD>} WantedFileField */

/**
 * @param {UsedCursor} cursor
 * @param {WantedFileField | WantedFileField[]} wantedFields 
 */
export function getCursorAsFileWantedFields(cursor, wantedFields) {
    if (cursor === undefined) return undefined;

    if (cursor.type === "File") {
        if (wantedFields instanceof Array) {
            return cursor.value.map(file => wantedFields.map(field => file[field]));
        } else {
            return cursor.value.map(file => file[wantedFields]);
        }
    } else {
        return undefined;
    }
}