/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { clientjsonStringify } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { Files } from "../../db/taggables.js";
import { Z_FILE_ID } from "../zod-types.js";

export function validate(dbs, req, res) {
    const fileIDs = z.array(Z_FILE_ID).safeParse(req?.body?.fileIDs, {path: ["fileIDs"]});
    if (!fileIDs.success) return fileIDs.error.message;

    return {
        fileIDs: fileIDs.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES],
        objects: {
            File_IDs: req.body.fileIDs
        }
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    return res.status(200).send(clientjsonStringify(await Files.selectManyByIDs(dbs, req.body.fileIDs)));
}
