/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalTagServices } from "../../db/tags.js";

export async function validate(dbs, req, res) {
    const localTagServiceID = z.coerce.number().nonnegative().safeParse(req?.body?.localTagServiceID, {path: "localTagServiceID"});
    if (!localTagServiceID.success) return localTagServiceID.error.message;
    const serviceName = z.string().nonempty().max(200).safeParse(req?.body?.serviceName, {path: "serviceName"});
    if (!serviceName.success) return serviceName.error.message;

    return {
        localTagServiceID: localTagServiceID.data,
        serviceName: serviceName.data
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.IS_ADMIN, BITS: PERMISSION_BITS.ALL};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission() {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalTagServices.update(dbs, req.body.localTagServiceID, req.body.serviceName);
    res.status(200).send("Local tag service updated");
}
