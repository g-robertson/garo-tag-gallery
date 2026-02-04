/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import path from "path";
import { TMP_FOLDER } from "../../db/db-util.js";

import { Cursor } from "../../db/cursor-manager.js";
import { T_DAY, unusedID } from "../../client/js/client-util.js";

/** @typedef {Cursor<"Path", string>} PathCursor */

export async function validate(dbs, req, res) {
    return;
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    /** @type {PathCursor} */
    const pathCursor = new Cursor({
        cursorType: "Path",
        cursorValue: path.join(TMP_FOLDER, `__NOT_PARTIAL__${unusedID()}`),
        cursorTimeout: 1 * T_DAY
    });
    dbs.cursorManager.addCursorToUser(req.user.id(), pathCursor);
    res.send(pathCursor.id());
}
