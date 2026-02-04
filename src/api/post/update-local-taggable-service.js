/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { LocalTaggableServices } from "../../db/taggables.js";
import { Z_USER_LOCAL_TAGGABLE_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localTaggableServiceID = Z_USER_LOCAL_TAGGABLE_SERVICE_ID.safeParse(req?.body?.localTaggableServiceID, {path: "localTaggableServiceID"});
    if (!localTaggableServiceID.success) return localTaggableServiceID.error.message;
    const serviceName = z.string().nonempty().max(200).safeParse(req?.body?.serviceName, {path: "serviceName"});
    if (!serviceName.success) return serviceName.error.message;

    return {
        localTaggableServiceID: localTaggableServiceID.data,
        serviceName: serviceName.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.UPDATE_LOCAL_TAGGABLE_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalTaggableServices.update(dbs, req.body.localTaggableServiceID, req.body.serviceName);
    res.status(200).send("Local taggable service updated");
}
