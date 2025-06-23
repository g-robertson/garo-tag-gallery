/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { importFilesFromHydrusJob } from "../../db/import.js";
import { LocalTaggableServices } from "../../db/taggables.js";
import { LocalTagServices } from "../../db/tags.js";

export async function validate(dbs, req, res) {
    const partialUploadPath = z.string().nonempty().max(120).safeParse(req.partialUploadPath, {path: ["partialUploadPath"]});
    if (!partialUploadPath.success) return partialUploadPath.error.message;
    const partialFilePaths = z.array(z.string().nonempty().max(120)).safeParse(req.partialFilePaths, ["partialFilePaths"]);
    if (!partialFilePaths.success) return partialFilePaths.error.message;

    const localTagServiceID = z.coerce.number().nonnegative().int().safeParse(req?.body?.localTagServiceID, {path: ["localTagServiceID"]});
    if (!localTagServiceID.success) return localTagServiceID.error.message;

    const localTaggableServiceID = z.coerce.number().nonnegative().int().safeParse(req?.body?.localTaggableServiceID, {path: ["localTaggableServiceID"]});
    if (!localTaggableServiceID.success) return localTaggableServiceID.error.message;

    return {
        partialUploadPath: partialUploadPath.data,
        partialFilePaths: partialFilePaths.data,
        localTagServiceID: localTagServiceID.data,
        localTaggableServiceID: localTaggableServiceID.data
    };
}

export const PERMISSIONS_REQUIRED = [{
    TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
    BITS: PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE
}, {
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE
}];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTagService = await LocalTagServices.userSelectByID(dbs, req.user, PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE, req.body.localTagServiceID);
    const localTaggableService = await LocalTaggableServices.userSelectByID(dbs, req.user, PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE, req.body.localTaggableServiceID);
    return localTagService !== undefined && localTaggableService !== undefined;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    dbs.jobManager.addJobToRunner(req.user.id(), importFilesFromHydrusJob(
        dbs,
        req.body.partialUploadPath,
        req.body.partialFilePaths,
        req.body.localTagServiceID,
        req.body.localTaggableServiceID
    ));
    res.status(200).send("Summoned job");
}
