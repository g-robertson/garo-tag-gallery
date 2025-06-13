/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { joinUsersPermittedObjects } from "../../db/user.js";

export const PERMISSIONS_REQUIRED = PERMISSIONS.NONE;
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.READ;
export async function checkPermission(dbs, req, res) {
    return false;
}

export async function validate(dbs, req, res) {}

/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const joinedUser = await joinUsersPermittedObjects(dbs, req.user);
    res.send(bjsonStringify(joinedUser.toJSON()));
}
