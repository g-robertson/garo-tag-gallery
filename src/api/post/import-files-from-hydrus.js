/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { importFilesFromHydrus } from "../../db/import.js";
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

    const localTagService = await LocalTagServices.userSelectByID(dbs, req.user, PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE, localTagServiceID.data);
    if (localTagService === undefined) {
        return "User did not have (create | update) access to local tag service";
    }
    const localTaggableService = await LocalTaggableServices.userSelectByID(dbs, req.user, PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE, localTaggableServiceID.data);
    if (localTaggableService === undefined) {
        return "User did not have (create | update) access to local taggable service";
    }

    req.sanitizedBody = {
        partialUploadPath: partialUploadPath.data,
        partialFilePaths: partialFilePaths.data,
        localTagService,
        localTaggableService
    };
}

export const PERMISSIONS_REQUIRED = [{
    TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
    BITS: PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE
}, {
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.CREATE | PERMISSION_BITS.UPDATE
}];
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    const err = await importFilesFromHydrus(
        dbs,
        req.sanitizedBody.partialUploadPath,
        req.sanitizedBody.partialFilePaths,
        req.sanitizedBody.localTagService,
        req.sanitizedBody.localTaggableService
    );
    if (err === undefined) {
        res.status(200).send("Finished retrieving file");
    } else {
        res.status(400).send(err);
    }
}
