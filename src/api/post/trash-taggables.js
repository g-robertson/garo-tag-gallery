/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { Taggables } from "../../db/taggables.js";
import { Z_TAGGABLE_ID } from "../zod-types.js";

const Z_CLIENT_TAG = z.object({
    displayName: z.string(),
    tagName: z.string(),
    namespaces: z.array(z.string()),
    tagCount: z.number()
});

/** @typedef {z.infer<typeof Z_CLIENT_TAG>} ClientTag */


export async function validate(dbs, req, res) {
    const taggableIDs = z.array(Z_TAGGABLE_ID).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;

    return {
        taggableIDs: taggableIDs.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.LOCAL_TAGGABLE_SERVICES.TRASH_TAGGABLES],
        objects: {
            Taggable_IDs: req.body.taggableIDs
        }
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await Taggables.trashManyByIDs(dbs, req.body.taggableIDs);

    res.status(200).send("Updated taggables");
}
