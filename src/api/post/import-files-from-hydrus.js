/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { importFilesFromHydrus } from "../../db/import.js";
import { userSelectLocalTaggableService } from "../../db/taggables.js";
import { userSelectLocalTagService } from "../../db/tags.js";

export const PERMISSIONS_REQUIRED = [PERMISSIONS.LOCAL_TAGGABLE_SERVICES, PERMISSIONS.LOCAL_TAG_SERVICES];
export async function checkPermission() {
    return false;
}

/** @type {APIFunction} */
export default async function post(dbs, req, res) {
    if (req.partialUploadPath === undefined || req.partialFilePaths === undefined) {
        return res.status(400).send("Partial upload path or partial file paths were undefined");
    }
    const localTagService = await userSelectLocalTagService(dbs, req.user, PERMISSION_BITS.UPDATE, req.body.localTagServiceID);
    const localTaggableService = await userSelectLocalTaggableService(dbs, req.user, PERMISSION_BITS.UPDATE, req.body.localTaggableServiceID);
    if (localTagService === undefined || localTaggableService === undefined) {
        return res.status(400).send("Local tag service or local taggable service were undefined");
    }

    const err = await importFilesFromHydrus(dbs, req.partialUploadPath, req.partialFilePaths, localTagService, localTaggableService);
    if (err !== undefined) {
        res.status(200).send("Finished retrieving file");
    } else {
        res.status(400).send(err);
    }
}
