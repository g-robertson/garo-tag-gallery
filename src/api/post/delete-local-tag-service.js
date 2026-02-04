/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { LocalTagServices } from "../../db/tags.js";
import { Z_USER_LOCAL_TAG_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localTagServiceID = Z_USER_LOCAL_TAG_SERVICE_ID.safeParse(req?.body?.localTagServiceID, {path: "localTagServiceID"});
    if (!localTagServiceID.success) return localTagServiceID.error.message;

    return {
        localTagServiceID: localTagServiceID.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.DELETE_LOCAL_TAG_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalTagServices.deleteByID(dbs, req.body.localTagServiceID);
    res.status(200).send("Local tag service deleted");
}
