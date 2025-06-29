/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalTaggableServices } from "../../db/taggables.js";

export async function validate(dbs, req, res) {
    const localTaggableServiceID = z.number().nonnegative().safeParse(req?.body?.localTaggableServiceID, {path: "localTaggableServiceID"});
    if (!localTaggableServiceID.success) return localTaggableServiceID.error.message;

    return {
        localTaggableServiceID: localTaggableServiceID.data
    };
}

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.IS_ADMIN, BITS: PERMISSION_BITS.ALL};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission() {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalTaggableServices.deleteByID(dbs, req.body.localTaggableServiceID);
    res.status(200).send("Local taggable service deleted");
}
