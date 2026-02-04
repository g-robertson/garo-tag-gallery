/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { importFilesFromHydrusJob } from "../../db/import.js";
import { Z_USER_LOCAL_TAG_SERVICE_ID, Z_USER_LOCAL_TAGGABLE_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const uploadPath = z.string().nonempty().max(255).safeParse(req.uploadPath, {path: ["uploadPath"]});
    if (!uploadPath.success) return uploadPath.error.message;
    const filePaths = z.array(z.string().nonempty().max(255)).safeParse(req.filePaths, ["filePaths"]);
    if (!filePaths.success) return filePaths.error.message;

    const localTagServiceID = Z_USER_LOCAL_TAG_SERVICE_ID.safeParse(req?.body?.localTagServiceID, {path: ["localTagServiceID"]});
    if (!localTagServiceID.success) return localTagServiceID.error.message;

    const localTaggableServiceID = Z_USER_LOCAL_TAGGABLE_SERVICE_ID.safeParse(req?.body?.localTaggableServiceID, {path: ["localTaggableServiceID"]});
    if (!localTaggableServiceID.success) return localTaggableServiceID.error.message;

    return {
        uploadPath: uploadPath.data,
        filePaths: filePaths.data,
        localTagServiceID: localTagServiceID.data,
        localTaggableServiceID: localTaggableServiceID.data
    };
}


/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [
            PERMISSIONS.LOCAL_TAGGABLE_SERVICES.CREATE_TAGGABLES,
            PERMISSIONS.LOCAL_TAGGABLE_SERVICES.UPDATE_TAGGABLES,
            PERMISSIONS.LOCAL_TAG_SERVICES.CREATE_TAGS,
            PERMISSIONS.LOCAL_TAG_SERVICES.APPLY_TAGS,
        ],
        objects: {
            Local_Tag_Service_IDs: [req.body.localTagServiceID],
            Local_Taggable_Service_IDs: [req.body.localTaggableServiceID]
        }
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    dbs.jobManager.addJobToRunner(req.user.id(), importFilesFromHydrusJob(
        dbs,
        req.body.uploadPath,
        req.body.filePaths,
        req.body.localTagServiceID,
        req.body.localTaggableServiceID
    ));
    res.status(200).send("Summoned job");
}
