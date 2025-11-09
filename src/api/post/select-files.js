/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { bjsonStringify, clientjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { Files, LocalFiles, LocalTaggableServices, UserFacingLocalFiles } from "../../db/taggables.js";
import { LocalTagServices } from "../../db/tags.js";

export function validate(dbs, req, res) {
    const fileIDs = z.array(z.number().nonnegative().int()).safeParse(req?.body?.fileIDs, {path: ["fileIDs"]});
    if (!fileIDs.success) return fileIDs.error.message;

    return {
        fileIDs: fileIDs.data
    };
}

export const PERMISSIONS_REQUIRED = {
    TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
    BITS: PERMISSION_BITS.READ
};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTaggableServiceIDs = new Set((await LocalTaggableServices.userSelectAll(
        dbs,
        req.user,
        PERMISSION_BITS.READ
    )).map(localTaggableService => localTaggableService.Local_Taggable_Service_ID));

    /** @type {Set<bigint>} */
    const allTaggables = new Set();
    const files = LocalFiles.dedupeLocalFilesTaggables(await LocalFiles.selectManyByFileIDs(dbs, req.body.fileIDs));
    for (const file of files) {
        for (const taggable of file.Taggable_ID) {
            allTaggables.add(taggable);
        }
    }
    const taggablesLocalTaggableServicesMap = await LocalTaggableServices.selectMappedByTaggableIDs(dbs, [...allTaggables]);

    for (const file of files) {
        let taggableMatchedTaggableService = false;
        for (const taggable of file.Taggable_ID) {
            if (localTaggableServiceIDs.has(taggablesLocalTaggableServicesMap.get(taggable).Local_Taggable_Service_ID)) {
                taggableMatchedTaggableService = true;
                break;
            }
        }

        if (!taggableMatchedTaggableService) {
            return false;
        }
    }

    return true;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    return res.status(200).send(clientjsonStringify(await Files.selectManyByIDs(dbs, req.body.fileIDs)));
}
