/**
 * @import {APIFunction} from "../api-types.js"
 */

import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { importFilesFromHydrus } from "../../db/import.js";
import { userSelectLocalTaggableService } from "../../db/taggables.js";
import { userSelectLocalTagService } from "../../db/tags.js";

export async function validate(dbs, req, res) {
    const partialUploadPath = req.partialUploadPath;
    if (typeof partialUploadPath !== "string") {
        return "partialUploadPath was not a string";
    }
    const partialFilePaths = req.partialFilePaths;
    if (!(partialFilePaths instanceof Array)) {
        return "partialFilePaths was not an array";
    }
    for (const partialFilePath of partialFilePaths) {
        if (typeof partialFilePath !== "string") {
            return "partialFilePaths was not an array of strings";
        }
    }
    const localTagServiceID = Number(req?.body?.localTagServiceID);
    if (!Number.isSafeInteger(localTagServiceID)) {
        return "localTagServiceID was not a number";
    }
    const localTaggableServiceID = Number(req?.body?.localTaggableServiceID);
    if (!Number.isSafeInteger(localTaggableServiceID)) {
        return "localTaggableServiceID was not a number";
    }
    const localTagService = await userSelectLocalTagService(dbs, req.user, PERMISSION_BITS.UPDATE, localTagServiceID);
    if (localTagService === undefined) {
        return "User did not have update access to local tag service";
    }
    const localTaggableService = await userSelectLocalTaggableService(dbs, req.user, PERMISSION_BITS.UPDATE, localTaggableServiceID);
    if (localTaggableService === undefined) {
        return "User did not have update access to local taggable service";
    }

    req.sanitizedBody = {
        partialUploadPath,
        partialFilePaths,
        localTagService,
        localTaggableService
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.LOCAL_TAGGABLE_SERVICES, PERMISSIONS.LOCAL_TAG_SERVICES];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.CREATE;
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
