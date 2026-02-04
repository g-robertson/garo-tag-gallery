/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { Namespaces } from "../../db/tags.js";

export async function validate(dbs, req, res) {}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const namespaces = await Namespaces.selectAll(dbs);
    res.send(bjsonStringify(namespaces));
}
