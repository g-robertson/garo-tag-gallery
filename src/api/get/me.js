/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { Users } from "../../db/user.js";

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.NONE, BITS: 0};
export async function checkPermission(dbs, req, res) {
    return false;
}

export async function validate(dbs, req, res) {}

/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const joinedUser = await Users.joinUsersPermittedObjects(dbs, req.user);
    res.send(bjsonStringify(joinedUser.toJSON()));
}
