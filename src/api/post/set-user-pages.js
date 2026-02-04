/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { Users } from "../../db/user.js";

export async function validate(dbs, req, res) {
    const pages = z.array(z.record(z.any())).safeParse(req?.body?.pages);
    if (!pages.success) return pages.error.message;

    return {
        pages: pages.data
    };
}


/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    Users.setPagesJSON(dbs, req.userAccessKey, req.body.pages);
    res.status(200).send("Set pages onto user");
}
