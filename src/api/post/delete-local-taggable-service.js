/**
 * @import {APIFunction, APIGetPermissionsFunction, APIValidationFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { LocalTaggableServices } from "../../db/taggables.js";
import { Z_USER_LOCAL_TAGGABLE_SERVICE_ID } from "../zod-types.js";

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const localTaggableServiceID = Z_USER_LOCAL_TAGGABLE_SERVICE_ID.safeParse(req?.body?.localTaggableServiceID, {path: "localTaggableServiceID"});
    if (!localTaggableServiceID.success) return localTaggableServiceID.error.message;

    return {
        localTaggableServiceID: localTaggableServiceID.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.DELETE_LOCAL_TAGGABLE_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalTaggableServices.deleteByID(dbs, req.body.localTaggableServiceID);
    res.status(200).send("Local taggable service deleted");
}
