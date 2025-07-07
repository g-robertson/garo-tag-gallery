/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalTaggableServices, Taggables } from "../../db/taggables.js";
import { dbBeginTransaction, dbEndTransaction } from "../../db/db-util.js";

const Z_CLIENT_TAG = z.object({
    displayName: z.string(),
    tagName: z.string(),
    namespaces: z.array(z.string()),
    tagCount: z.number()
});

/** @typedef {z.infer<typeof Z_CLIENT_TAG>} ClientTag */


export async function validate(dbs, req, res) {
    const taggableIDs = z.array(z.number().nonnegative().int()).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;

    return {
        taggableIDs: taggableIDs.data.map(BigInt),
    };
}

export const PERMISSIONS_REQUIRED = [
    {TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES, BITS: PERMISSION_BITS.DELETE}
];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTaggableServicesToCheck = await LocalTaggableServices.selectManyByTaggableIDs(dbs, req.body.taggableIDs);
    const localTaggableServices = await LocalTaggableServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.DELETE, localTaggableServicesToCheck.map(localTaggableService => localTaggableService.Local_Taggable_Service_ID));

    return localTaggableServicesToCheck.length === localTaggableServices.length;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await Taggables.trashManyByIDs(dbs, req.body.taggableIDs);

    res.status(200).send("Updated taggables");
}
