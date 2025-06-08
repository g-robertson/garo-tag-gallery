/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { joinUsersPermittedObjects } from "../../db/user.js";

export const PERMISSIONS_REQUIRED = PERMISSIONS.NONE;
export async function checkPermission() {
    return true;
}

/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const joinedUser = await joinUsersPermittedObjects(dbs, req.user);
    res.send(bjsonStringify(joinedUser.toJSON()));
}
