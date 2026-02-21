/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { Z_USER_LOCAL_DOWNLOADER_SERVICE_ID } from "../zod-types.js";
import { LocalDownloaderServices } from "../../db/downloaders.js";

export async function validate(dbs, req, res) {
    const localDownloaderServiceID = Z_USER_LOCAL_DOWNLOADER_SERVICE_ID.safeParse(req?.body?.localDownloaderServiceID, {path: "localDownloaderServiceID"});
    if (!localDownloaderServiceID.success) return localDownloaderServiceID.error.message;
    const serviceName = z.string().nonempty().max(200).safeParse(req?.body?.serviceName, {path: "serviceName"});
    if (!serviceName.success) return serviceName.error.message;

    return {
        localDownloaderServiceID: localDownloaderServiceID.data,
        serviceName: serviceName.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.ADMINISTRATIVE.UPDATE_LOCAL_DOWNLOADER_SERVICE],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    await LocalDownloaderServices.update(dbs, req.body.localDownloaderServiceID, req.body.serviceName);
    res.status(200).send("Local metric service updated");
}
