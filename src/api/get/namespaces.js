/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { Namespaces } from "../../db/tags.js";

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.NONE, BITS: 0};

export async function validate(dbs, req, res) {}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const namespaces = await Namespaces.selectAll(dbs);
    res.send(bjsonStringify(namespaces));
}
