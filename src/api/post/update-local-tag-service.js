/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { LocalTagServices } from "../../db/tags.js";
import { Z_USER_LOCAL_TAG_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const localTagServiceID = Z_USER_LOCAL_TAG_SERVICE_ID.safeParse(req?.body?.localTagServiceID, {path: "localTagServiceID"});
    if (!localTagServiceID.success) return localTagServiceID.error.message;
    const serviceName = z.string().nonempty().max(200).safeParse(req?.body?.serviceName, {path: "serviceName"});
    if (!serviceName.success) return serviceName.error.message;

    return {
        localTagServiceID: localTagServiceID.data,
        serviceName: serviceName.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.UPDATE_LOCAL_TAG_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalTagServices.update(dbs, req.body.localTagServiceID, req.body.serviceName);
    res.status(200).send("Local tag service updated");
}
